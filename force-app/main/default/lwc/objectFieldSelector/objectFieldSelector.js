import { LightningElement, track, wire } from 'lwc';
import getObjects from '@salesforce/apex/ObjectInfoController.getObjects';

export default class ObjectFieldSelector extends LightningElement {

    @track objectOptions = [];
    @track selectedObject = '';
    @track fieldRows = [{ id: 1, value: '' }];
    activeRowIndex = null;

    get selectedFields() {
        return this.fieldRows
            .map(r => r.value)
            .filter(v => v && v.trim() !== '');
    }

    @wire(getObjects)
    wiredObjects({ data }) {
        if (data) {
            this.objectOptions = data.map(o => ({ label: o, value: o }));
        }
    }

    handleObjectChange(e) {
        this.selectedObject = e.detail.value;
        this.fieldRows = [{ id: 1, value: '' }];
    }

    addRow(e) {
        const idx = parseInt(e.target.dataset.index, 10);

        this.fieldRows.splice(idx + 1, 0, {
            id: Date.now(),
            value: ''  
        });

        this.fieldRows = [...this.fieldRows];
    }

    removeRow(e) {
        const idx = parseInt(e.target.dataset.index, 10);
        this.fieldRows.splice(idx, 1);

        if (this.fieldRows.length === 0) {
            this.fieldRows = [{ id: 1, value: '' }];
        } else {
            this.fieldRows = [...this.fieldRows];
        }
    }

    openFieldPopup(e) {
        this.activeRowIndex = parseInt(e.target.dataset.index, 10);

        const child = this.template.querySelector('c-object-data-viewer');
        if (child) {
            child.openPopup();
        }
    }

    handleFieldSelect(e) {
        const fieldName = e.detail;

        this.fieldRows[this.activeRowIndex].value = fieldName;
        this.fieldRows = [...this.fieldRows];
    }

    preview() {
        const child = this.template.querySelector('c-object-data-viewer');
        if (child) {
            child.previewRecords();
        }
    }
}
