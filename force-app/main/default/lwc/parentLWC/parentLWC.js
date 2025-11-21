import { LightningElement, wire } from 'lwc';
import getObjects from '@salesforce/apex/searchObject.getObjects';

export default class ParentLWC extends LightningElement {
    allObjects = [];
    filteredObjects = [];
    searchKey = '';
    showList = false;
    selectedObject = '';

    showPopup = false;
    currentFieldId = null;

    inputFields = [
        { id: 1, value: '', showRemove: false }
    ];

    fieldCounter = 1;

    @wire(getObjects)
    wiredObjects({ error, data }) {
        if (data) {
            this.allObjects = data;
            this.filteredObjects = data;
        } else if (error) {
            console.error('PARENT → getObjects error', error);
        }
    }

    openPopup(event) {
        console.log('PARENT → openPopup fired');
        const idRaw = event.currentTarget && event.currentTarget.dataset
            ? event.currentTarget.dataset.id
            : undefined;
        console.log('event.currentTarget.dataset.id:', idRaw);
        this.currentFieldId = parseInt(idRaw, 10);
        console.log('PARENT → currentFieldId set to:', this.currentFieldId);
        this.showPopup = true;
    }

    closePopup() {
        setTimeout(() => {
            this.showPopup = false;
        }, 0);
    }

    handleFieldSelected(event) {
        console.log('PARENT → fieldselect EVENT RECEIVED');
        const selectedField = event.detail;
        console.log('PARENT → field selected:', selectedField);
        console.log('PARENT → currentFieldId:', this.currentFieldId);

        const updated = this.inputFields.map(f =>
            f.id === this.currentFieldId
                ? { ...f, value: selectedField }
                : f
        );

        console.log('PARENT → updated inputFields:', JSON.parse(JSON.stringify(updated)));

        this.inputFields = updated;

        setTimeout(() => {
            this.showPopup = false;
        }, 0);
    }

    openList() {
        this.showList = true;
    }

    handleInput(event) {
        this.searchKey = event.target.value;
        const key = this.searchKey.toLowerCase();

        if (!this.searchKey) {
            this.selectedObject = '';
            this.showList = false;

            this.inputFields = [
                { id: 1, value: '', showRemove: false }
            ];
            this.fieldCounter = 1;
            return;
        }

        this.showList = true;

        this.filteredObjects = this.allObjects.filter(o =>
            o.toLowerCase().includes(key)
        );
    }

    handleBlur() {
        setTimeout(() => {
            this.showList = false;
        }, 200);
    }

    selectObject(event) {
        console.log('PARENT → Object selected:', event.currentTarget.dataset.name);
        this.selectedObject = event.currentTarget.dataset.name;
        this.searchKey = this.selectedObject;
        this.showList = false;
    }

    handleFieldChange(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        const val = event.target.value;
        console.log('PARENT → handleFieldChange id:', id, 'value:', val);
        this.inputFields = this.inputFields.map(f =>
            f.id === id ? { ...f, value: val } : f
        );
    }

    addField(event) {
        console.log('PARENT → addField');
        console.log('Before:', JSON.parse(JSON.stringify(this.inputFields)));
        this.fieldCounter++;

        this.inputFields = [
            ...this.inputFields,
            { id: this.fieldCounter, value: '', showRemove: true }
        ];

        if (this.inputFields.length > 1) {
            this.inputFields = this.inputFields.map((f, idx) =>
                idx === 0 ? { ...f, showRemove: true } : f
            );
        }
        console.log('After:', JSON.parse(JSON.stringify(this.inputFields)));
    }

    removeField(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);

        this.inputFields = this.inputFields.filter(f => f.id !== id);

        if (this.inputFields.length === 1) {
            this.inputFields = this.inputFields.map(f =>
                ({ ...f, showRemove: false })
            );
        }
    }
}
//---