import { api, track } from 'lwc';
import LightningModal from 'lightning/modal';

import getReviewFeedbackWithItems from '@salesforce/apex/GuiltyReviewerController.getReviewFeedbackWithItemsById';
import submitReviewFeedback from '@salesforce/apex/GuiltyReviewerController.submitReviewFeedback';
import saveReviewFeedback from '@salesforce/apex/GuiltyReviewerController.saveReviewFeedback';

export default class ReviewerFeedbackRecordModal extends LightningModal {
    @api feedbackId;

    generalComment = '';
    isLoading = false;
    feedbackRecord;
    feedbackFields = [];

    async connectedCallback() {
        this.isLoading = true;
        await getReviewFeedbackWithItems({ reviewFeedbackId: this.feedbackId })
            .then(result => {
                console.log('HERE === ');
                console.log(result);
                this.feedbackRecord = result.reviewFeedback;
                this.feedbackFields = result.items;
            })
            .catch(error => {
                // toast
                console.log(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    get validationOptions() {
        return [
            { label: 'Accurate', value: 'Good' },
            { label: 'Inaccurate', value: 'Bad' }
        ];
    }

    get generalInstructions() {
        return this.feedbackRecord?.ReviewProcessId__r?.ReviewInstructions__c;
    }

    get reviewFeedbackName() {
        return this.feedbackRecord?.Name;
    }

    handleFieldValidationChange(event) {
        const feedbackFieldId = event.target.dataset.id;
        const value = event.detail.value;

        this.feedbackFields = this.feedbackFields.map(item => {
            return item.id === feedbackFieldId ? { ...item, validation: value } : item;
        });

        console.log(JSON.stringify(this.feedbackFields));
    }

    handleFieldCommentChange(event) {
        const feedbackFieldId = event.target.dataset.id;
        const value = event.detail.value;

        this.feedbackFields = this.feedbackFields.map(item => {
            return item.id === feedbackFieldId ? { ...item, comment: value } : item;
        });

        console.log(JSON.stringify(this.feedbackFields));
    }

    handleGeneralCommentChange(event) {
        this.generalComment = event.detail.value;
        this.feedbackRecord.AdditionalComment__c = this.generalComment;
    }

    async handleReviewSave(event) {
        this.isLoading = true;
        await saveReviewFeedback({ reviewFeedbackDTO: this.buildReviewFeedbackDTO })
            .then(() => {
                // success message toast
            })
            .catch(error => {
                // toast
                console.log(error);
            })
            .finally(() => {
                this.isLoading = false;
            });

        this.close('save');
    }

    async handleReviewSubmit(event) {
        this.isLoading = true;

        const isValid = this.validateFeedbackFields();
        if (isValid) {
            console.log('a');
            await submitReviewFeedback({ reviewFeedbackDTO: this.buildReviewFeedbackDTO })
                .then(() => {
                    // success message toast
                })    
                .catch(error => {
                    // toast
                    console.log(error);
                });

            this.close('submit');
        }

        this.isLoading = false;
    }

    validateFeedbackFields() {
        let isValid = true;
        let firstInvalid = null;

        this.feedbackFields.forEach(field => {
            const radioGroup = this.template.querySelector(`lightning-radio-group[data-id="${field.id}"]`);

            if (!field.validation || field.validation.trim() === '') {
                isValid = false;

                if (radioGroup) {
                    radioGroup.setCustomValidity('Your assessment is required');
                    radioGroup.reportValidity();

                    if (!firstInvalid) {
                        firstInvalid = radioGroup;
                    }
                }
            } else {
                if (radioGroup) {
                    radioGroup.setCustomValidity('');
                    radioGroup.reportValidity();
                }
            }
        });

        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (!isValid) {
            // toast message
        }

        return isValid;
    }

    get buildReviewFeedbackDTO() {
        return {
            reviewFeedback: this.feedbackRecord,
            items: this.feedbackFields.map(field => ({
                id: field.id,
                comment: field.comment || '',
                assessment: field.validation || ''
            }))
        };
    }

}