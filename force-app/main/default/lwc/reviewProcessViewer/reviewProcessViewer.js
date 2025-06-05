import { LightningElement, track, api } from 'lwc';

export default class ReviewProcessViewer extends LightningElement {
    @api recordId;

    @track isLoading = false;
}