import { LightningElement, api, track } from 'lwc';
import getFieldsWithRelations from '@salesforce/apex/searchObject.getFieldsWithRelations';
import getReferenceToObjects from '@salesforce/apex/searchObject.getReferenceToObjects';

const MAX_DEPTH = 5;

export default class ObjectFieldPopup extends LightningElement {
    @api objectName;
    @track panels = [];
    rootLoaded = false;

    renderedCallback() {
        if (this.objectName && !this.rootLoaded) {
            this.rootLoaded = true;
            this.loadPanelForObject(this.objectName, 0, null, null);
        }
    }

    _toFieldObjects(defArr, parentArr, childArr) {
        const list = [];
        (defArr || []).forEach(n => list.push({ name: n, isRelationship: false, isChildRelationship: false }));
        (parentArr || []).forEach(n => list.push({ name: n, isRelationship: true, isChildRelationship: false }));
        (childArr || []).forEach(n => list.push({ name: n, isRelationship: false, isChildRelationship: true }));
        return list;
    }

    loadPanelForObject(objectApiName, depth, expandedFrom, expandedType) {
        if (!objectApiName) return Promise.resolve();
        if (depth >= MAX_DEPTH) return Promise.resolve();

        return getFieldsWithRelations({ objectName: objectApiName })
            .then(data => {
                const def = data.default || [];
                const parents = data.parents || [];
                const children = data.children || [];
                const childrenMap = data.childrenMap || {};

                const fields = this._toFieldObjects(def, parents, children);

                const panel = {
                    objectName: objectApiName,
                    fields,
                    mode: 'all',
                    search: '',
                    expandedFrom: expandedFrom || null,
                    expandedType: expandedType || null,
                    childrenMap
                };

                this.panels = [...this.panels.slice(0, depth), panel];
            })
            .catch(err => {
                console.error('POPUP → Error loading fields for', objectApiName, err);
            });
    }

    expandRelation(event) {
        event.stopPropagation();
        const fieldName = event.currentTarget.dataset.name;
        const panelIndex = parseInt(event.currentTarget.dataset.panel, 10);
        if (isNaN(panelIndex)) return;

        const parentPanel = this.panels[panelIndex];
        if (!parentPanel) return;

        const fieldObj = parentPanel.fields.find(f => f.name === fieldName);
        if (!fieldObj) return;

        if (fieldObj.isRelationship) {
            getReferenceToObjects({ objectName: parentPanel.objectName, fieldName: fieldName })
                .then(refs => {
                    if (!refs || !refs.length) {
                        console.warn('POPUP → No reference objects for', fieldName);
                        return;
                    }
                    const relatedObject = refs[0];
                    this.loadPanelForObject(relatedObject, panelIndex + 1, fieldName, 'parent');
                })
                .catch(err => {
                    console.error('POPUP → Error fetching reference objects for', fieldName, err);
                });
            return;
        }

        if (fieldObj.isChildRelationship) {
            const childName = fieldName;
            const targetObjectName = parentPanel.childrenMap && parentPanel.childrenMap[childName];
            if (!targetObjectName) {
                console.warn('POPUP → No child object mapping for', childName);
                return;
            }
            this.loadPanelForObject(targetObjectName, panelIndex + 1, childName, 'child');
        }
    }

    chooseField(event) {
        event.stopPropagation();
        const fld = event.currentTarget.dataset.name;
        const panelIndex = parseInt(event.currentTarget.dataset.panel, 10);
        if (isNaN(panelIndex)) return;
        const pathParts = [];

        for (let i = 1; i <= panelIndex; i++) {
            const p = this.panels[i];
            if (p && p.expandedFrom) {
                if (p.expandedType === 'parent') {
                    const seg = p.expandedFrom.endsWith('Id') ? p.expandedFrom.slice(0, -2) : p.expandedFrom;
                    pathParts.push(seg);
                } else if (p.expandedType === 'child') {
                    pathParts.push(p.expandedFrom);
                } else {
                    pathParts.push(p.expandedFrom);
                }
            }
        }

        pathParts.push(fld);

        const dotted = pathParts.join('.');
        this.dispatchEvent(new CustomEvent('fieldselect', {
            detail: dotted,
            bubbles: true,
            composed: true
        }));

        this.dispatchEvent(new CustomEvent('closepopup', { bubbles: true, composed: true }));
    }

    changeMode(event) {
        event.stopPropagation();
        const panelIndex = parseInt(event.currentTarget.dataset.panel, 10);
        const mode = event.currentTarget.dataset.mode;
        if (isNaN(panelIndex)) return;
        const p = this.panels[panelIndex];
        if (!p) return;
        p.mode = mode;
        this.panels = [...this.panels];
    }

    onSearchInput(event) {
        event.stopPropagation();
        const panelIndex = parseInt(event.currentTarget.dataset.panel, 10);
        if (isNaN(panelIndex)) return;
        const p = this.panels[panelIndex];
        if (!p) return;
        p.search = event.target.value || '';
        this.panels = [...this.panels];
    }

    getFilteredFields(panel) {
        const mode = panel.mode || 'all';
        let list = panel.fields || [];

        if (mode === 'parent') {
            list = list.filter(f => f.isRelationship);
        } else if (mode === 'child') {
            list = list.filter(f => f.isChildRelationship);
        } else {
            list = list.filter(f => !f.isRelationship && !f.isChildRelationship);
        }

        if (panel.search && panel.search.trim()) {
            const q = panel.search.toLowerCase();
            list = list.filter(f => f.name.toLowerCase().includes(q));
        }
        return list;
    }

    get panelsView() {
        return this.panels.map((p, idx) => {
            const all = p.fields || [];
            const filtered = this.getFilteredFields({ ...p, fields: all });

            return {
                idx,
                objectName: p.objectName,
                mode: p.mode,
                search: p.search || '',
                expandedFrom: p.expandedFrom || null,
                filteredFieldsGroup: filtered.filter(f => !f.isRelationship && !f.isChildRelationship),
                filteredParentGroup: filtered.filter(f => f.isRelationship),
                filteredChildGroup: filtered.filter(f => f.isChildRelationship),
                showFields: p.mode === 'all',
                showParents: p.mode === 'parent',
                showChildren: p.mode === 'child',
                childrenMap: p.childrenMap || {},
                allBtnClass: p.mode === 'all' ? 'btn active' : 'btn',
                parentBtnClass: p.mode === 'parent' ? 'btn active' : 'btn',
                childBtnClass: p.mode === 'child' ? 'btn active' : 'btn'
            };
        });
    }

    stopProp(event) {
        event.stopPropagation();
    }

    closePopup() {
        this.dispatchEvent(new CustomEvent('closepopup', { bubbles: true, composed: true }));
    }
}