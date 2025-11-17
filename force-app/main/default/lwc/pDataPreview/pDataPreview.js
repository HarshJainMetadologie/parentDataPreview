import { LightningElement, wire, track } from 'lwc';
import getObjects from '@salesforce/apex/ObjectSearchController.getObjects';

export default class PDataPreview extends LightningElement {
    @track allObjects = [];
    @track filteredObjects = [];
    @track showList = false;
    @track expandedObjects = [];

    selectedObject = '';
    searchKey = '';

    @wire(getObjects)
    wiredObjects({ data, error }) {
        if (data) {
            this.allObjects = data;
            this.filteredObjects = data;
        } else if (error) {
            console.error('Error fetching objects:', error);
        }
    }

    handleSearch(event) {
        this.searchKey = event.target.value;
        if (this.searchKey) {
            this.filteredObjects = this.allObjects.filter(obj =>
                obj.toLowerCase().includes(this.searchKey.toLowerCase())
            );
            this.showList = this.filteredObjects.length > 0;
        } else {
            this.showList = false;
            this.selectedObject = '';
            this.expandedObjects = [];
        }
    }

    selectObject(event) {
        const selected = event.target.textContent;
        this.selectedObject = selected;
        this.searchKey = selected; 
        this.showList = false;
        this.expandedObjects = []; 
    }

    handleExpand(event) {
        const { relatedObject, relatedLabel, depth } = event.detail;

        const isDuplicate = this.expandedObjects.some(
            rel => rel.name === relatedObject
        );
        if (isDuplicate) {
            alert(`"${relatedObject}" already expanded.`);
            return;
        }

        if (depth < 5) {
            this.expandedObjects = [
                ...this.expandedObjects,
                { name: relatedObject, label: relatedLabel, depth: depth + 1 }
            ];
        } else {
            alert('Maximum relation depth (5) reached!');
        }
    }
}


// import { LightningElement, wire, track } from 'lwc';
// import getObjects from '@salesforce/apex/ObjectSearchController.getObjects';

// export default class PDataPreview extends LightningElement {
//     @track allObjects = [];
//     @track filteredObjects = [];
//     @track showList = false;

//     searchKey = '';
//     selectedObject = '';

//     @wire(getObjects)
//     wiredObjects({ data, error }) {
//         if (data) {
//             this.allObjects = data;
//             this.filteredObjects = data;
//         } else if (error) {
//             console.error('Error fetching objects:', error);
//         }
//     }

//     handleSearch(event) {
//         this.searchKey = event.target.value;
//         if (this.searchKey) {
//             this.filteredObjects = this.allObjects.filter(obj =>
//                 obj.toLowerCase().includes(this.searchKey.toLowerCase())
//             );
//             this.showList = true;
//         } else {
//             this.showList = false;
//             this.selectedObject = '';
//         }
//     }

//     selectObject(event) {
//         this.selectedObject = event.target.textContent;
//         this.searchKey = this.selectedObject;
//         this.showList = false;
//     }
// }
