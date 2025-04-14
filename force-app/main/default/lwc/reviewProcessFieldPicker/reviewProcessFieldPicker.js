import { LightningElement, api, track } from 'lwc';

import getSobjectFields from '@salesforce/apex/ReviewProcessController.getAllSObjectFields';

export default class ReviewProcessFieldPicker extends LightningElement {
    @api record;
    @api stepKey;

    reviewObjectFields;
    @track fieldOptions = [
        { label: 'New', value: 'new' },
        { label: 'In Progress', value: 'inProgress' },
        { label: 'Finished', value: 'finished' },
    ];

    @track selectedFields = [
        {
            field: "Status",
            helptext: "AAAAAAAAAAAAAAAAA"
        },
        {
            field: "Status2",
            helptext: "AAAAAAAAAAAAAAAAA"
        }
    ];
}