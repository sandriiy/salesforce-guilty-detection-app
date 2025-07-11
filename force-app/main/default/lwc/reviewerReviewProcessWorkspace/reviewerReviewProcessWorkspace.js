import { LightningElement, wire, track } from 'lwc';
import Id from '@salesforce/user/Id';
import getReviewProcesses from '@salesforce/apex/GuiltyReviewerController.getOngoingReviewProcesses';

export default class ReviewerReviewProcessWorkspace extends LightningElement {
    @track reviewProcesses = [];
    @track isLoading = true;
    userId = Id;
    
    @wire(getReviewProcesses, { userId: "$userId" })
    wiredReviews({ data, error }) {
        if (data) {
            this.reviewProcesses = this.prepareReviewProcesses(data);
            this.isLoading = false;
        } else if (error) {
            // toast message
            this.isLoading = false;
        }
    }

    prepareReviewProcesses(data) {
        return data.map(process => {
            const formattedDate = this.convertToReadableDate(process.EndDateTime__c);
            const allFeedbacks = process.Review_Feedback__r || [];
            const unreviewedFeedbacks = allFeedbacks.filter(feedback => feedback.isReviewed__c === false);
            const reviewedCount = allFeedbacks.filter(feedback => feedback.isReviewed__c === true).length;

            return {
                Id: process.Id,
                Name: process.Name,
                endDateLabel: `By ${formattedDate}`,
                totalRecords: process.TotalReviewableRecords__c,
                completedFeedback: reviewedCount,
                feedbacks: unreviewedFeedbacks
            };
        });
    }

    convertToReadableDate(datetime) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(datetime));
    }
}