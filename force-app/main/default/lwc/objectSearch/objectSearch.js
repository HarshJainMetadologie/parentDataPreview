import { LightningElement, track, wire } from 'lwc';
import getObjects from '@salesforce/apex/ObjectSearchController.getObjects';
import getPreviewData from '@salesforce/apex/ObjectSearchController.getPreviewData';

export default class objectSearch extends LightningElement {

    @track allObjects = [];
    @track filteredObjects = [];
    @track searchKey = '';
    @track showList = false;
    @track selectedObject = '';

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

    connectedCallback() {
        this.outsideClickHandler = this.closeList.bind(this);
        window.addEventListener('click', this.outsideClickHandler);
    }
    disconnectedCallback() {
        window.removeEventListener('click', this.outsideClickHandler);
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    handleTyping(event) {
        const raw = event.target.value || '';
        const key = raw.toLowerCase();
        this.searchKey = raw;

        if (!key.trim()) {
            this.selectedObject = '';
            this.inputBoxes = [{ id: 1, value: '' }];
            this.showList = false;
            this.showPopup = false;
            this.clearPreview();
            return;
        }

        this.filteredObjects = this.allObjects.filter(o =>
            o.toLowerCase().includes(key)
        );

        this.showList = true;
    }

    openList(event) {
        if ((this.searchKey || '').trim()) {
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

    openPopup(event) {
        const wrapper = event.target.closest('[data-id]');
        if (!wrapper) return;

        this.currentBoxId = wrapper.dataset.id;
        this.showPopup = true;

        const child = this.template.querySelector('c-field-popup');
        if (child) {
            child.currentObject = this.selectedObject;
            child.chain = [];
        }
    }

    closePopup() {
        this.showPopup = false;
    }

    handleFieldSelect(event) {
        const fieldName = event.detail;
        if (!fieldName) return;

        this.inputBoxes = this.inputBoxes.map(box =>
            box.id == this.currentBoxId ? { ...box, value: fieldName } : box
        );

        this.showPopup = false;
    }

    addBox() {
        const id = this.inputBoxes.length + 1;
        this.inputBoxes = [...this.inputBoxes, { id, value: '' }];
    }

    removeBox(event) {
        const id = event.target.dataset.id;
        if (this.inputBoxes.length > 1) {
            this.inputBoxes = this.inputBoxes.filter(b => b.id != id);
        }
    }

   fixField(field) {
        if (!field.includes('.')) {
            return field.toLowerCase();
        }

        let parts = field.split('.');
        parts[0] = parts[0].toLowerCase();
        return parts.join('.');
    }


    preview() {
        const userFields = this.inputBoxes
            .map(b => b.value)
            .filter(v => v && v.trim() !== "");

        if (!this.selectedObject || userFields.length === 0) {
            this.showPreview = false;
            return;
        }

        const fixedFields = userFields.map(f => this.fixField(f));

        console.log("Final SOQL Fields:", fixedFields);

        this.previewColumns = fixedFields.map((f, idx) => ({
            label: f,
            fieldName: "col" + idx,
            type: "text"
        }));

        getPreviewData({
            objectName: this.selectedObject,
            fields: fixedFields
        })
            .then(result => {
                const rows = result.map((record, rIndex) => {
                    const row = { id: rIndex + 1 };
                    fixedFields.forEach((f, idx) => {
                        row["col" + idx] = record[f] ?? "—";
                    });
                    return row;
                });

                this.previewData = rows;
                this.showPreview = true;
            })
            .catch(err => {
                console.error("APEX ERROR =", JSON.parse(JSON.stringify(err)));
                this.previewData = [];
                this.showPreview = true;
            });
    }



    clearPreview() {
        this.previewColumns = [];
        this.previewData = [];
        this.showPreview = false;
    }
}
