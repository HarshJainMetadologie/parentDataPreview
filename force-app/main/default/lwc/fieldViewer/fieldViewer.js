import { LightningElement, api, wire, track } from 'lwc';
import getFields from '@salesforce/apex/ObjectExplorerController.getFields';

export default class FieldViewer extends LightningElement {
    @api objectName;
    @api depth = 1;
    @track fields = [];

    @wire(getFields, { objectName: '$objectName' })
    wiredFields({ data, error }) {
        if (data) {
            this.fields = data;
        } else if (error) {
            console.error(error);
        }
    }

    handleExpand(event) {
        const relatedObject = event.target.dataset.related;
        this.dispatchEvent(new CustomEvent('expand', {
            detail: { relatedObject, depth: this.depth }
        }));
    }

    selectField(event) {
        const field = event.target.textContent;
        this.dispatchEvent(new CustomEvent('fieldselect', { detail: field }));
    }
}
