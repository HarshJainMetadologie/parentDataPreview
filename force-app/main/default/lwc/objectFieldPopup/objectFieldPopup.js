import { LightningElement, api, wire, track } from 'lwc';
import getFieldsWithRelations from '@salesforce/apex/searchObject.getFieldsWithRelations';

export default class ObjectFieldPopup extends LightningElement {
    @api objectName;

    @track defaultFields = [];
    @track parentFields = [];
    @track childFields = [];

    @track mode = 'all';

    @wire(getFieldsWithRelations, { objectName: '$objectName' })
    wiredFields({ error, data }) {
        console.log('CHILD → wiredFields fired', { objectName: this.objectName });
        if (data) {
            console.log('CHILD → default fields:', data.default);
            console.log('CHILD → parent fields:', data.parents);
            console.log('CHILD → child fields:', data.children);
            this.defaultFields = data.default || [];
            this.parentFields = data.parents || [];
            this.childFields = data.children || [];
        }
        if (error) {
            console.error('CHILD → Apex error:', error);
        }
    }

    closePopup() {
        this.dispatchEvent(new CustomEvent('closepopup', { bubbles: true, composed: true }));
    }

    changeMode(event) {
        const m = event.currentTarget && event.currentTarget.dataset ? event.currentTarget.dataset.mode : undefined;
        this.mode = m || 'all';
        console.log('CHILD → Mode changed to:', this.mode);
    }

    chooseField(event) {
        console.log("======= CHILD chooseField START =======");

        console.log("event.target:", event.target);
        console.log("event.currentTarget:", event.currentTarget);

        console.log("event.target.dataset:", event.target.dataset);
        console.log("event.currentTarget.dataset:", event.currentTarget.dataset);

        const nameFromTarget = event.target.dataset?.name;
        const nameFromCurrent = event.currentTarget.dataset?.name;

        console.log("nameFromTarget:", nameFromTarget);
        console.log("nameFromCurrent:", nameFromCurrent);

        const fieldName = nameFromCurrent || nameFromTarget;
        console.log("FINAL fieldName =", fieldName);

        if (!fieldName) {
            console.error("ERROR: fieldName is undefined — THIS breaks the popup");
        }

        console.log("Dispatching fieldselect now...");

        try {
            this.dispatchEvent(new CustomEvent("fieldselect", {
                detail: fieldName,
                bubbles: true,
                composed: true
            }));
            console.log("Dispatch success!");
        } catch (e) {
            console.error("Dispatch FAILED!", e);
        }

        console.log("======= CHILD chooseField END =======");
    }


    get displayFields() {
        if (this.mode === 'parent') {
            return [...this.defaultFields, ...this.parentFields];
        }
        if (this.mode === 'child') {
            return [...this.defaultFields, ...this.childFields];
        }
        return [...this.defaultFields, ...this.parentFields, ...this.childFields];
    }

    get allBtnClass() {
        return this.mode === 'all' ? 'btn active' : 'btn';
    }

    get parentBtnClass() {
        return this.mode === 'parent' ? 'btn active' : 'btn';
    }

    get childBtnClass() {
        return this.mode === 'child' ? 'btn active' : 'btn';
    }

    stopProp(event) {
        event.stopPropagation();
    }
}
//====