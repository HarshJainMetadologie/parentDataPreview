import { LightningElement, api, track, wire } from 'lwc';
import getObjectFields from '@salesforce/apex/ObjectInfoController.getObjectFields';
import getRecords from '@salesforce/apex/ObjectInfoController.getRecords';

export default class ObjectDataViewer extends LightningElement {

    @api objectName;
    @api selectedFields;

    @track fields = [];
    @track showPopup = false;

    @track records = [];
    @track columns = [];

    @wire(getObjectFields, { objectName: '$objectName' })
    wiredFields({ data }) {
        if (data) {
            this.fields = data;
        }
    }

    @api openPopup() {
        this.showPopup = true;
    }

    closePopup() {
        this.showPopup = false;
    }

    selectField(e) {
        const apiName = e.currentTarget.dataset.field;

        this.dispatchEvent(
            new CustomEvent('fieldselect', { detail: apiName })
        );

        this.showPopup = false;
    }

    @api previewRecords() {
        if (!this.objectName || !this.selectedFields || this.selectedFields.length === 0) {
            return;
        }

        getRecords({
            objectName: this.objectName,
            fields: this.selectedFields
        }).then(data => {
            this.records = data;

            this.columns = this.selectedFields.map(f => ({
                label: f,
                fieldName: f
            }));
        });
    }
}
