import { LightningElement, api, wire, track } from 'lwc';
import getFields from '@salesforce/apex/ObjectExplorerController.getFields';

export default class FieldList extends LightningElement {
    @api objectName;
    @api depth = 1;
    @track fields = [];

    @wire(getFields, { objectName: '$objectName' })
    wiredFields({ data, error }) {
        if (data) {
            this.fields = data;
        } else if (error) {
            console.error('Error fetching fields:', error);
        }
    }

    handleExpand(event) {
        const relatedObject = event.target.dataset.relatedapi;
        const relatedLabel = event.target.dataset.relatedlabel;
        this.dispatchEvent(
            new CustomEvent('expand', {
                detail: { relatedObject, relatedLabel, depth: this.depth }
            })
        );
    }
}
