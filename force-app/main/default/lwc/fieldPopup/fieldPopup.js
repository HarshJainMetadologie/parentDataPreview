import { LightningElement, api, track } from 'lwc';
import getFieldsWithRelationships 
    from '@salesforce/apex/ObjectSearchController.getFieldsWithRelationships';

export default class FieldPopup extends LightningElement {

    @api objectName = '';
    @api mode = '';     
    @track visible = false;
    @track panels = [];

    stopPropagation(e) {
        e.stopPropagation();
    }

    @api async openPopup() {
        this.visible = true;
        this.panels = [];

        if (this.objectName) {
            await this.loadPanel(this.objectName, '');
        }
    }

    async loadPanel(objectName, prefix) {
        try {
            const data = await getFieldsWithRelationships({ objectName });

            let normals = data.filter(f => !f.isLookup && !f.isChild);

            let filtered = [];

            if (this.mode === 'parent') {
                filtered = [
                    ...normals,                   
                    ...data.filter(f => f.isLookup)
                ];
            } 
            else if (this.mode === 'child') {
                filtered = [
                    ...normals,                
                    ...data.filter(f => f.isChild)  
                ];
            } 
            else {
                filtered = data;  
            }

            const fields = filtered.map(f => {
                let target = (f.referenceObjects && f.referenceObjects.length)
                    ? f.referenceObjects[0]
                    : null;

                let rel = f.name;
                if (rel.toLowerCase().endsWith('id')) {
                    rel = rel.slice(0, -2);
                }

                return {
                    name: f.name,
                    label: f.label,
                    isLookup: f.isLookup,
                    isChild: f.isChild,
                    fullName: prefix + f.name,
                    targetObject: target,
                    nextPrefix: prefix + rel.toLowerCase() + ".",
                    childPrefix: prefix + f.name.toLowerCase() + "." 
                };
            });

            this.panels = [
                ...this.panels,
                {
                    id: this.panels.length,
                    objectName,
                    fields
                }
            ];

        } catch (error) {
            console.error('loadPanel error:', error);
        }
    }

    expand(event) {
        const target = event.currentTarget.dataset.target;
        const prefix = event.currentTarget.dataset.prefix;

        if (!target) return;

        if (this.panels.length >= 5) {
            alert("Maximum depth reached (5)");
            return;
        }

        this.loadPanel(target, prefix);
    }

    selectField(event) {
        const value = event.currentTarget.dataset.full;
        if (!value) return;

        this.dispatchEvent(new CustomEvent('fieldselect', {
            detail: value
        }));

        this.close();
    }

    close() {
        this.visible = false;
        this.panels = [];
        this.dispatchEvent(new CustomEvent('closepopup'));
    }
}




// import { LightningElement, api, track } from 'lwc';
// import getFieldsWithRelationships from '@salesforce/apex/ObjectSearchController.getFieldsWithRelationships';

// export default class FieldPopup extends LightningElement {

//     @api objectName = '';
//     @track panels = []; 
//     @track visible = false;

//     stopPropagation(e) {
//         e.stopPropagation();
//     }

//     @api async openPopup() {
//         this.panels = [];
//         if (!this.objectName) {
//             console.warn('fieldPopup.openPopup called without objectName');
//             this.visible = false;
//             return;
//         }
//         this.visible = true;
//         await this.loadPanel(this.objectName, '');
//     }

//     async loadPanel(objectName, prefix) {
//         try {
//             const data = await getFieldsWithRelationships({ objectName });
//             if (!Array.isArray(data) || data.length === 0) {
//                 this.panels = [
//                     ...this.panels,
//                     {
//                         id: this.panels.length,
//                         objectName,
//                         fields: []
//                     }
//                 ];
//                 return;
//             }

//             const fields = data.map(f => {
//                 const targetObj = Array.isArray(f.referenceObjects) && f.referenceObjects.length ? f.referenceObjects[0] : null;
//                 const relationName = f.relationshipName || f.name.replace(/Id$/i, '');
//                 return {
//                     name: f.name,
//                     label: f.label || f.name,
//                     isLookup: !!f.isLookup,
//                     fullName: prefix + f.name,
//                     targetObject: targetObj,
//                     nextPrefix: prefix + (relationName ? relationName.toLowerCase() + '.' : '')
//                 };
//             });

//             this.panels = [
//                 ...this.panels,
//                 {
//                     id: this.panels.length,
//                     objectName,
//                     fields
//                 }
//             ];
//         } catch (e) {
//             console.error('Error in loadPanel', e);
//             this.panels = [
//                 ...this.panels,
//                 {
//                     id: this.panels.length,
//                     objectName,
//                     fields: []
//                 }
//             ];
//         }
//     }

//     expand(event) {
//         const target = event.currentTarget;
//         const targetObject = target.dataset.target;
//         const prefix = target.dataset.prefix || '';
//         if (!targetObject) return;

//         if (this.panels.length >= 5) {
//             alert('Maximum depth is 5');
//             return;
//         }
//         this.loadPanel(targetObject, prefix);
//     }

//     selectField(event) {
//         const full = event.currentTarget.dataset.full;
//         if (!full) return;
//         this.dispatchEvent(new CustomEvent('fieldselect', { detail: full }));
//         this.close();
//     }

//     close() {
//         this.panels = [];
//         this.visible = false;
//         this.dispatchEvent(new CustomEvent('closepopup'));
//     }
// }