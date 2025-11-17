import { LightningElement, wire, track } from 'lwc';
import getObjects from '@salesforce/apex/ObjectExplorerController.getObjects';
import getRecords from '@salesforce/apex/ObjectExplorerController.getRecords';

export default class ObjectExplorer extends LightningElement {
    @track allObjects = [];
    @track filteredObjects = [];
    @track showList = false;
    @track expandedObjects = [];
    @track selectedFields = [];
    @track records = [];
    @track columns = [];

    selectedObject = '';
    searchKey = '';

    @wire(getObjects)
    wiredObjects({ data, error }) {
        if (data) {
            this.allObjects = data;
            this.filteredObjects = data;
        } else if (error) {
            console.error(error);
        }
    }

    handleSearch(event) {
        this.searchKey = event.target.value;

        if (this.searchKey && this.searchKey.trim() !== '') {
            this.filteredObjects = this.allObjects.filter(obj =>
                obj.toLowerCase().includes(this.searchKey.toLowerCase())
            );
            this.showList = this.filteredObjects.length > 0;
        } 
        else {
            this.searchKey = '';
            this.showList = false;
            this.selectedObject = '';
            this.expandedObjects = [];
            this.selectedFields = [];
            this.records = [];
            this.columns = [];
        }
    }


    selectObject(event) {
        this.selectedObject = event.target.textContent;
        this.searchKey = this.selectedObject;
        this.showList = false;
        this.expandedObjects = [];
        this.records = [];
        this.columns = [];
        this.selectedFields = [];
    }

    handleExpand(event) {
        const { relatedObject } = event.detail;

        const alreadyExists = this.expandedObjects.some(obj => obj.name === relatedObject);
        if (alreadyExists) {
            alert(`${relatedObject} already expanded.`);
            return;
        }

        const currentDepth = this.expandedObjects.length + 1;

        if (currentDepth < 5) {
            this.expandedObjects = [
                ...this.expandedObjects,
                { name: relatedObject, depth: currentDepth + 1 }
            ];
        } else {
            alert('Maximum relation depth (5) reached!');
        }
    }


    handleFieldSelect(event) {
        const field = event.detail;
        if (!this.selectedFields.includes(field)) {
            this.selectedFields.push(field);
        }
        this.updateTable();
    }

    addField() {
        this.updateTable();
    }

    removeField() {
        this.selectedFields.pop();
        this.updateTable();
    }

    updateTable() {
        if (this.selectedObject && this.selectedFields.length > 0) {
            getRecords({ objectName: this.selectedObject, fieldNames: this.selectedFields })
                .then(data => {
                    this.records = data;
                    this.columns = this.selectedFields.map(f => ({
                        label: f,
                        fieldName: f,
                        type: 'text'
                    }));
                })
                .catch(err => console.error(err));
        }
    }
}
