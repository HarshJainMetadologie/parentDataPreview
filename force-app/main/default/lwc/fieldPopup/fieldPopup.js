import { LightningElement, api, track, wire } from 'lwc';
import getFieldsWithRelationships from '@salesforce/apex/ObjectSearchController.getFieldsWithRelationships';

export default class FieldPopup extends LightningElement {

    @api showPopup;
    @api objectName;

    @track fields = [];
    @track currentObject = '';
    chain = [];

    connectedCallback() {
        this.currentObject = this.objectName;
    }

    stopPropagation(e) {
        e.stopPropagation();
    }

    get chainString() {
        return this.chain.join('.');
    }

    @wire(getFieldsWithRelationships, { objectName: '$currentObject' })
    wiredFields({ data }) {
        if (data) {
            this.fields = data.map(f => ({
                name: f.name,
                label: f.label,
                isLookup: f.isLookup,
                referenceObjectsString: JSON.stringify(f.referenceObjects)
            }));
        }
    }

    selectField(event) {
        const field = event.currentTarget.dataset.name;

        let final = '';
        if (this.chain.length === 0) {
            final = field;
        } else {
            final = [...this.chain, field].join('.');
        }

        this.dispatchEvent(new CustomEvent('fieldselect', { detail: final }));
        this.close();
    }

   expand(event) {
        const field = event.currentTarget.dataset.name;
        const refList = JSON.parse(event.currentTarget.dataset.ref || '[]');

        if (!refList.length) return;

        let rel = field;

        rel = rel.charAt(0).toUpperCase() + rel.slice(1);

        if (rel.toLowerCase().endsWith('id')) {
            rel = rel.slice(0, -2);
        }

        this.chain = [...this.chain, rel];

        this.currentObject = refList[0];
    }



    close() {
        this.chain = [];
        this.dispatchEvent(new CustomEvent('closepopup'));
    }
}
