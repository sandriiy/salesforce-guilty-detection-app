import { api, track } from 'lwc';
import LightningModal from 'lightning/modal';
import { showToast } from 'c/utils';

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
                this.feedbackRecord = result.reviewFeedback;
                this.feedbackFields = result.items;
				this.initialization();
            })
            .catch(error => {
                console.log(error);
				showToast(
					this,
					'Unable to retrieve information about Review Process',
					'Please reload the page or try again later',
					'error'
				);

				this.close();
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
            return item.id === feedbackFieldId ? { ...item, assessment: value } : item;
        });
    }

    handleFieldCommentChange(event) {
        const feedbackFieldId = event.target.dataset.id;
        const value = event.detail.value;

        this.feedbackFields = this.feedbackFields.map(item => {
            return item.id === feedbackFieldId ? { ...item, comment: value } : item;
        });
    }

    handleGeneralCommentChange(event) {
        this.generalComment = event.detail.value;
        this.feedbackRecord.AdditionalComment__c = this.generalComment;
    }

    async handleReviewSave(event) {
        this.isLoading = true;
        await saveReviewFeedback({ reviewFeedbackDTO: this.buildReviewFeedbackDTO })
            .then(() => {
                showToast(
					this,
					'Your feedback has been successfully saved',
					'Note: It\’s not submitted yet, you can keep working on it anytime',
					'success'
				);
            })
            .catch(error => {
				console.log(error);
                showToast(
					this,
					'Unable To Save Your Review',
					'For more information, contact your System Administrator',
					'error'
				);
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
            await submitReviewFeedback({ reviewFeedbackDTO: this.buildReviewFeedbackDTO })
                .then(() => {
                    showToast(
						this,
						'Your feedback has been successfully submitted',
						'This feedback is complete and requires no further follow-up',
						'success'
					);
                })    
                .catch(error => {
					console.log(error);
                    showToast(
						this,
						'Unable To Submit Your Review',
						'For more information, contact your System Administrator',
						'error'
					);
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
            if (!field.assessment || field.assessment.trim() === '') {
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
            showToast(
				this,
				'Please fix the errors before proceeding',
				'',
				'warning'
			);
        }

        return isValid;
    }

    get buildReviewFeedbackDTO() {
        return {
            reviewFeedback: this.feedbackRecord,
            items: this.feedbackFields.map(field => ({
                id: field.id,
                comment: field.comment || '',
                assessment: field.assessment || ''
            }))
        };
    }

	initialization() {
		if (this.feedbackRecord?.AdditionalComment__c) {
			this.generalComment = this.feedbackRecord?.AdditionalComment__c;
		}
	}

}