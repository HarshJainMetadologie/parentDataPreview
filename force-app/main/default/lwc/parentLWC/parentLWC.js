import { LightningElement, wire } from 'lwc';
import getObjects from '@salesforce/apex/searchObject.getObjects';
import previewRecords from '@salesforce/apex/searchObject.previewRecords';

export default class ParentLWC extends LightningElement {
    allObjects = [];
    filteredObjects = [];
    searchKey = '';
    showList = false;
    selectedObject = '';

    showPopup = false;
    currentFieldId = null;
    records = [];
    columns = [];

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
    getValuesForPath(rowObj, parts) {
        if (!rowObj) return [null];

        const flatKey = parts.join('_');
        if (rowObj.hasOwnProperty(flatKey)) {
            return [rowObj[flatKey]];
        }

        if (parts.length === 1 && rowObj.hasOwnProperty(parts[0])) {
            return [rowObj[parts[0]]];
        }

        let current = rowObj;
        for (let i = 0; i < parts.length; i++) {

            const segment = parts[i];

            if (Array.isArray(current)) {
                let collected = [];
                current.forEach(item => {
                    collected = collected.concat(this.getValuesForPath(item, parts.slice(i)));
                });
                return collected.length ? collected : [null];
            }

            if (!current || typeof current !== "object") return [null];

            current = current[segment];
        }

        if (Array.isArray(current)) return current;
        return [current];
    }

    runPreview() {
    const selectedFields = this.inputFields
        .map(f => f.value)
        .filter(v => v && v.trim());

    if (!selectedFields.length) {
        this.records = [];
        this.columns = [];
        return;
    }

    previewRecords({
        objectName: this.selectedObject,
        fields: selectedFields
    })
    .then(result => {

        console.log("RAW APEX RESULT → ", JSON.parse(JSON.stringify(result)));

        this.columns = selectedFields.map(f => ({
            label: f,
            fieldName: f.replace(/\./g, "_"),
            type: "text"
        }));

        let finalRows = [];

        result.forEach(rowObj => {
            let flatRow = {};

            selectedFields.forEach(field => {
                const key = field.replace(/\./g, "_");
                const parts = field.split(".");

                const values = this.getValuesForPath(rowObj, parts);

                flatRow[key] = values[0] ?? null;
            });

            finalRows.push(flatRow);
        });

        console.log("FINAL FLATTENED ROWS → ", JSON.parse(JSON.stringify(finalRows)));

        this.records = finalRows;
    })
    .catch(err => {
        console.error("ERROR in previewRecords() → ", err);
        this.records = [];
        this.columns = [];
    });
}



    openPopup(event) {
        const idRaw = event.currentTarget && event.currentTarget.dataset
            ? event.currentTarget.dataset.id
            : undefined;
        this.currentFieldId = parseInt(idRaw, 10);
        this.showPopup = true;
    }

    closePopup() {
        setTimeout(() => {
            this.showPopup = false;
        }, 0);
    }

    handleFieldSelected(event) {
        const selectedField = event.detail;
        const updated = this.inputFields.map(f =>
            f.id === this.currentFieldId
                ? { ...f, value: selectedField }
                : f
        );
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

            this.records = [];
            this.columns = [];

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
        this.selectedObject = event.currentTarget.dataset.name;
        this.searchKey = this.selectedObject;
        this.showList = false;
    }

    handleFieldChange(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        const val = event.target.value;
        this.inputFields = this.inputFields.map(f =>
            f.id === id ? { ...f, value: val } : f
        );

        const allEmpty = this.inputFields.every(f => !f.value || f.value.trim() === '');
        if (allEmpty) {
            this.records = [];
            this.columns = [];
        }
    }

    addField(event) {
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
