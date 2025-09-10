public without sharing class ReviewFeedbackLifecycleService {
    private Id reviewerId;
    private Id reviewProcessId;
    private ReviewProcess__c reviewProcess;

    public ReviewFeedbackLifecycleService(Id userId, Id reviewProcessId) {
        this.reviewerId = userId;
        this.reviewProcessId = reviewProcessId;
    }

    public ReviewFeedback__c createNewReviewFeedback() {
        this.reviewProcess = new ReviewProcessSelector().selectById(reviewProcessId);
        SObject recordToReview = this.findUnreviewedRecord(this.reviewProcess);
        ReviewFeedback__c reviewFeedback = this.createReviewFeedbackWithItems(recordToReview);
        return reviewFeedback;
    }

    public void saveDraftReviewFeedback(ReviewFeedbackDTO reviewFeedbackDTO) {
        this.saveReviewFeedbackItems(reviewFeedbackDTO.items);
        this.saveReviewFeedback(reviewFeedbackDTO.reviewFeedback, false);
    }

    public void submitReviewFeedback(ReviewFeedbackDTO reviewFeedbackDTO) {
        this.saveReviewFeedbackItems(reviewFeedbackDTO.items);
        this.saveReviewFeedback(reviewFeedbackDTO.reviewFeedback, true);
    }

    private SObject findUnreviewedRecord(ReviewProcess__c reviewProcess) {
        ReviewFilterCriteriaWrapper criteriaWrapper = (ReviewFilterCriteriaWrapper) JSON.deserialize(
            reviewProcess.FilterCriteria__c,
            ReviewFilterCriteriaWrapper.class
        );

        String targetSobject = criteriaWrapper.selectedSObject;
        Set<String> fieldsToSelect = new Set<String>{ 'Id' };
        if (!String.isBlank(reviewProcess.FieldsForReview__c)) {
            ReviewSelectedFieldsWrapper fieldsWrapper = (ReviewSelectedFieldsWrapper) JSON.deserialize(
                reviewProcess.FieldsForReview__c,
                ReviewSelectedFieldsWrapper.class
            );

            if (fieldsWrapper != null && fieldsWrapper.selectedFields != null) {
                for (ReviewSelectedFieldsWrapper.SelectedField selectedField : fieldsWrapper.selectedFields) {
                    if (!String.isBlank(selectedField.field)) {
                        fieldsToSelect.add(selectedField.field);
                    }
                }
            }
        }

        // TODO: TAKE FILTERS INTO ACCOUNT + EXTRACT THIS AWAY
        String soql =
            'SELECT ' + String.join(new List<String>(fieldsToSelect), ', ') +
            ' FROM ' + targetSobject +
            ' ORDER BY CreatedDate ASC ' +
            ' LIMIT 1';

        List<SObject> results = Database.query(soql);
        return results.isEmpty() ? null : results[0];
    }

    private void saveReviewFeedbackItems(List<ReviewFeedbackDTO.FeedbackItem> feedbackItems) {
        List<ReviewFeedbackItem__c> reviewFeedbackItems = new List<ReviewFeedbackItem__c>();

        for (ReviewFeedbackDTO.FeedbackItem feedbackItem : feedbackItems) {
            ReviewFeedbackItem__c reviewFeedbackItem = new ReviewFeedbackItem__c(
                Id = feedbackItem.id,
                Comment__c = feedbackItem.comment,
                Assessment__c = feedbackItem.assessment
            );

            reviewFeedbackItems.add(reviewFeedbackItem);
        }

        update reviewFeedbackItems;
    }

    private void saveReviewFeedback(ReviewFeedback__c reviewFeedback, Boolean isSubmit) {
        reviewFeedback.isReviewed__c = isSubmit;
        update reviewFeedback;
    }

    private ReviewFeedback__c createReviewFeedbackWithItems(SObject recordToReview) {
        ReviewFeedback__c feedback = new ReviewFeedback__c(
            RecordId__c = (String) recordToReview.get('Id'),
            RecordType__c = recordToReview.getSObjectType().getDescribe().getName(),
            ReviewProcessId__c = this.reviewProcessId,
            isReviewed__c = false,
            ReviewerId__c = this.reviewerId,
            AdditionalComment__c = this.reviewProcess.ReviewInstructions__c
        );

        insert feedback;

        List<ReviewSelectedFieldsWrapper.SelectedField> fieldsToReview = this.getSelectedReviewProcessFields(this.reviewProcess);
        if (!fieldsToReview.isEmpty()) {
            createReviewFeedbackItems(feedback.Id, recordToReview, fieldsToReview);
        } 
        
        return feedback;
    }

    private List<ReviewSelectedFieldsWrapper.SelectedField> getSelectedReviewProcessFields(ReviewProcess__c reviewProcess) {
        List<ReviewSelectedFieldsWrapper.SelectedField> fieldDefs = new List<ReviewSelectedFieldsWrapper.SelectedField>();
        
        if (String.isNotBlank(reviewProcess.FieldsForReview__c)) {
            ReviewSelectedFieldsWrapper fieldJson = (ReviewSelectedFieldsWrapper) JSON.deserialize(
                reviewProcess.FieldsForReview__c,
                ReviewSelectedFieldsWrapper.class
            );

            if (fieldJson != null && fieldJson.selectedFields != null) {
                fieldDefs.addAll(fieldJson.selectedFields);
            }
        }

        return fieldDefs;
    }

    private void createReviewFeedbackItems(Id reviewFeedbackId, SObject recordToReview, List<ReviewSelectedFieldsWrapper.SelectedField> fieldsToReview) {
        Map<String, Schema.SObjectField> describeMap = recordToReview.getSObjectType().getDescribe().fields.getMap();

        List<ReviewFeedbackItem__c> items = new List<ReviewFeedbackItem__c>();
        for (ReviewSelectedFieldsWrapper.SelectedField fieldToReview : fieldsToReview) {
            if (!describeMap.containsKey(fieldToReview.field)) continue;

            items.add(new ReviewFeedbackItem__c(
                ReviewFeedbackId__c = reviewFeedbackId,
                Name = fieldToReview.field,
                Type__c = String.valueOf(describeMap.get(fieldToReview.field).getDescribe().getType()),
                Instructions__c = fieldToReview.helptext
            ));
        }

        if (!items.isEmpty()) {
            insert items;
        }
    }
}