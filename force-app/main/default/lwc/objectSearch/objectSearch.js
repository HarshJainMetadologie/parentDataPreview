import { LightningElement, track, wire } from 'lwc';
import getObjects from '@salesforce/apex/ObjectSearchController.getObjects';
import getPreviewData from '@salesforce/apex/ObjectSearchController.getPreviewData';

export default class ObjectSearch extends LightningElement {

    @track allObjects = [];
    @track filteredObjects = [];
    @track searchKey = '';
    @track showList = false;
    @track selectedObject = '';

    @track mode = '';

    @track inputBoxes = [{ id: 1, value: '' }];
    @track showPopup = false;

    @track previewColumns = [];
    @track previewData = [];
    @track showPreview = false;

    currentBoxId = null;
    @wire(getObjects)
    wiredObjects({ data }) {
        if (data) {
            this.allObjects = data;
            this.filteredObjects = data;
        }
    }

    setMode(event) {
        this.mode = event.target.dataset.mode;

        this.inputBoxes = [{ id: 1, value: '' }];
        this.clearPreview();
        this.showPopup = false;
    }

    handleTyping(event) {
        const txt = event.target.value || '';
        this.searchKey = txt;

        if (!txt.trim()) {
            this.selectedObject = '';
            this.mode = '';
            this.inputBoxes = [{ id: 1, value: '' }];
            this.showList = false;
            this.clearPreview();
            return;
        }

        this.filteredObjects = this.allObjects.filter(obj =>
            obj.toLowerCase().includes(txt.toLowerCase())
        );

        this.showList = true;
    }

    openList(event) {
        if (this.searchKey.trim()) {
            this.showList = true;
        }
        event.stopPropagation();
    }

    selectObject(event) {
        const name = event.target.dataset.name;
        if (!name) return;

        this.selectedObject = name;
        this.searchKey = name;

        this.showList = false;
        this.inputBoxes = [{ id: 1, value: '' }];
        this.clearPreview();
    }

    closeList() {
        this.showList = false;
    }

    stopPropagation(e) {
        e.stopPropagation();
    }

    openPopup(event) {
        const wrap = event.target.closest('[data-id]');
        if (!wrap) return;

        this.currentBoxId = wrap.dataset.id;
        this.showPopup = true;

        const child = this.template.querySelector('c-field-popup');

        if (child) {
            child.objectName = this.selectedObject;
            child.mode = this.mode;     
            child.openPopup();              
        }
    }

    closePopup() {
        this.showPopup = false;

        const child = this.template.querySelector('c-field-popup');
        if (child && typeof child.close === 'function') {
            child.close();
        }
    }

    handleFieldSelect(event) {
        const field = event.detail;
        if (!field) return;

        this.inputBoxes = this.inputBoxes.map(b =>
            b.id == this.currentBoxId ? { ...b, value: field } : b
        );

        this.showPopup = false;
    }

    addBox() {
        const newId = this.inputBoxes.length + 1;
        this.inputBoxes = [...this.inputBoxes, { id: newId, value: '' }];
    }

    removeBox(event) {
        const id = event.target.dataset.id;
        if (this.inputBoxes.length > 1) {
            this.inputBoxes = this.inputBoxes.filter(b => b.id != id);
        }
    }

    fixField(f) {
        if (!f) return '';
        return f
            .split('.')
            .map(p => p.toLowerCase())
            .join('.');
    }

    preview() {
        const fields = this.inputBoxes
            .map(b => b.value)
            .filter(v => v && v.trim() !== '');

        if (!this.selectedObject || fields.length === 0) {
            this.showPreview = false;
            return;
        }

        const finalFields = fields.map(f => this.fixField(f));

        this.previewColumns = finalFields.map((f, i) => ({
            label: f,
            fieldName: 'col' + i,
            type: 'text'
        }));

        getPreviewData({
            objectName: this.selectedObject,
            fields: finalFields
        })
        .then(result => {
            const rows = result.map((rec, rIndex) => {
                const row = { id: rIndex + 1 };

                finalFields.forEach((f, idx) => {
                    let val = rec[f];

                    if (Array.isArray(val)) {
                        val = val.join(', ');
                    }

                    row['col' + idx] = val ?? '—';
                });

                return row;
            });

            this.previewData = rows;
            this.showPreview = true;
        })
        .catch(err => {
            this.previewData = [];
            this.showPreview = true;
        });
    }

    clearPreview() {
        this.previewColumns = [];
        this.previewData = [];
        this.showPreview = false;
    }
    get modeIsNotParent() {
        return this.mode !== 'parent';
    }

    get modeIsNotChild() {
        return this.mode !== 'child';
    }

}



// import { LightningElement, track, wire } from 'lwc';
// import getObjects from '@salesforce/apex/ObjectSearchController.getObjects';
// import getPreviewData from '@salesforce/apex/ObjectSearchController.getPreviewData';

// export default class ObjectSearch extends LightningElement {

//     @track allObjects = [];
//     @track filteredObjects = [];
//     @track searchKey = '';
//     @track showList = false;
//     @track selectedObject = '';
//     @track mode = '';

//     @track inputBoxes = [{ id: 1, value: '' }];
//     @track showPopup = false;

//     @track previewColumns = [];
//     @track previewData = [];
//     @track showPreview = false;

//     currentBoxId = null;

//     @wire(getObjects)
//     wiredObjects({ data }) {
//         if (data) {
//             this.allObjects = data;
//             this.filteredObjects = data;
//         }
//     }

//     setMode(event) {
//         this.mode = event.target.dataset.mode;

//         this.inputBoxes = [{ id: 1, value: '' }];
//         this.showPopup = false;
//         this.clearPreview();
//     }


//     connectedCallback() {
//         this.outsideClickHandler = this.closeList.bind(this);
//         window.addEventListener('click', this.outsideClickHandler);
//     }
//     disconnectedCallback() {
//         window.removeEventListener('click', this.outsideClickHandler);
//     }

//     stopPropagation(event) {
//         event.stopPropagation();
//     }

//     handleTyping(event) {
//         const raw = (event.target && event.target.value) ? event.target.value : '';
//         const key = raw.toLowerCase();
//         this.searchKey = raw;

//         if (!key.trim()) {
//             this.selectedObject = '';
//             this.inputBoxes = [{ id: 1, value: '' }];
//             this.showList = false;
//             this.showPopup = false;
//             this.mode = '';
//             this.clearPreview();
//             return;
//         }

//         this.filteredObjects = this.allObjects.filter(o =>
//             o.toLowerCase().includes(key)
//         );

//         this.showList = true;
//     }

//     openList(event) {
//         if ((this.searchKey || '').trim()) {
//             this.showList = true;
//         }
//         event.stopPropagation();
//     }

//     selectObject(event) {
//         const name = event.currentTarget?.dataset?.name || event.target?.dataset?.name;
//         if (!name) return;

//         this.selectedObject = name;
//         this.searchKey = name;

//         this.showList = false;
//         this.inputBoxes = [{ id: 1, value: '' }];
//         this.clearPreview();
//     }

//     closeList() {
//         this.showList = false;
//     }

//     openPopup(event) {
//         const wrapper = event.target.closest('[data-id]');
//         if (!wrapper) return;

//         this.currentBoxId = wrapper.dataset.id;
//         this.showPopup = true;

//         const child = this.template.querySelector('c-field-popup');
//         if (child && typeof child.openPopup === 'function') {
//             child.objectName = this.selectedObject; 
//             child.openPopup(); 
//         } else {
//             this.showPopup = true;
//         }
//     }

//     closePopup() {
//         this.showPopup = false;
//         const child = this.template.querySelector('c-field-popup');
//         if (child && typeof child.close === 'function') child.close();
//     }

//     handleFieldSelect(event) {
//         const fieldName = event.detail;
//         if (!fieldName) return;

//         this.inputBoxes = this.inputBoxes.map(box =>
//             box.id == this.currentBoxId ? { ...box, value: fieldName } : box
//         );

//         this.showPopup = false;
//     }

//     addBox() {
//         const id = this.inputBoxes.length + 1;
//         this.inputBoxes = [...this.inputBoxes, { id, value: '' }];
//     }

//     removeBox(event) {
//         const id = event.target.dataset.id;
//         if (this.inputBoxes.length > 1) {
//             this.inputBoxes = this.inputBoxes.filter(b => b.id != id);
//         }
//     }

//     fixField(field) {
//         if (!field || typeof field !== 'string') return '';
//         return field.split('.').map((p, idx) => {
//             return idx === 0 ? p.toLowerCase() : p.toLowerCase();
//         }).join('.');
//     }

//     preview() {
//         const userFields = this.inputBoxes
//             .map(b => b.value)
//             .filter(v => v && v.trim() !== "");

//         if (!this.selectedObject || userFields.length === 0) {
//             this.showPreview = false;
//             return;
//         }

//         const fixedFields = userFields.map(f => this.fixField(f));

//         this.previewColumns = fixedFields.map((f, idx) => ({
//             label: f,
//             fieldName: 'col' + idx,
//             type: 'text'
//         }));

//         getPreviewData({
//             objectName: this.selectedObject,
//             fields: fixedFields
//         })
//             .then(result => {
//                 const rows = result.map((record, rIndex) => {
//                     const row = { id: rIndex + 1 };
//                     fixedFields.forEach((f, idx) => {
//                         let value = undefined;
//                         if (record.hasOwnProperty(f)) {
//                             value = record[f];
//                         } else if (f.includes('.')) {
//                             const parts = f.split('.');
//                             let cur = record;
//                             for (const p of parts) {
//                                 if (!cur) { cur = undefined; break; }
//                                 cur = cur[p];
//                             }
//                             value = cur;
//                         } else {
//                             value = record[f];
//                         }
//                         row['col' + idx] = value == null ? '—' : String(value);
//                     });
//                     return row;
//                 });

//                 this.previewData = rows;
//                 this.showPreview = true;
//             })
//             .catch(err => {
//                 this.previewData = [];
//                 this.showPreview = true;
//             });
//     }

//     clearPreview() {
//         this.previewColumns = [];
//         this.previewData = [];
//         this.showPreview = false;
//     }
// }