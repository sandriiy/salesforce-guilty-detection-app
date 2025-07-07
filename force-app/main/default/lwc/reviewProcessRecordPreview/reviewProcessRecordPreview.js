import { api, track, wire } from 'lwc';
import LightningModal from 'lightning/modal';

const DISPLAY_LIMIT = 100;
const DEFAULT_FIELDS = [
    {
        label: 'Id', 
        fieldName: 'Id', 
        type: 'text', 
        sortable: false,
        cellAttributes: { class: 'slds-text-link' } 
    },
    { label: 'Name', fieldName: 'Name', type: 'text' }
];

export default class ReviewProcessRecordPreview extends LightningModal {
    @api filters;
    @api label;
    @api content;

    @track displayLimit = DISPLAY_LIMIT;
    @track records = [];
    @track columns = DEFAULT_FIELDS;

    // TODO: Retrieve Records for Preview

    handleAddFields() {
        // ...
    }

    get totalCount() {
        return this.records.length;
    }

    handleBack() {
        this.close('back');
    }

    handleOkay() {
        this.close('okay');
    }
}