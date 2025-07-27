public with sharing class ReviewFeedbackRecordAssembler {
    public static ReviewFeedbackDTO assemblePayloadWithItems(ReviewFeedback__c reviewFeedback) {
        if (reviewFeedback.ReviewFeedbackItems__r == null) {
            return buildReviewFeedbackDTO(reviewFeedback, null);
        }

        Set<String> fieldSet = new Set<String>();
        for (ReviewFeedbackItem__c feedbackItem : reviewFeedback.ReviewFeedbackItems__r) {
            if (String.isNotBlank(feedbackItem.Name)) {
                fieldSet.add(feedbackItem.Name);
            }
        }

        Id relatedRecordId = reviewFeedback.RecordId__c;
        String soql = 'SELECT ' + String.join(new List<String>(fieldSet), ',') +
            ' FROM ' + reviewFeedback.RecordType__c +
            ' WHERE Id = :relatedRecordId LIMIT 1';

        SObject targetRecord = Database.query(soql);
        return buildReviewFeedbackDTO(reviewFeedback, targetRecord);
    }

    private static ReviewFeedbackDTO buildReviewFeedbackDTO(ReviewFeedback__c reviewFeedback, SObject targetRecord) {
        ReviewFeedbackDTO dto = new ReviewFeedbackDTO();
        dto.reviewFeedback = reviewFeedback;
        dto.items = new List<ReviewFeedbackDTO.FeedbackItem>();

        if (targetRecord != null) {
            for (ReviewFeedbackItem__c feedbackItem : reviewFeedback.ReviewFeedbackItems__r) {
                ReviewFeedbackDTO.FeedbackItem feedbackItemDTO = new ReviewFeedbackDTO.FeedbackItem();
                feedbackItemDTO.id = feedbackItem.Id;
                feedbackItemDTO.fieldName = feedbackItem.Name;
                feedbackItemDTO.fieldType = feedbackItem.Type__c;
                feedbackItemDTO.instructions = feedbackItem.Instructions__c;
                feedbackItemDTO.value = (targetRecord != null) ? targetRecord.get(feedbackItem.Name) : null;
                dto.items.add(feedbackItemDTO);
            }
        }

        return dto;
    }
}