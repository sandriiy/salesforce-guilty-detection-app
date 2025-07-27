public class ReviewFeedbackDTO {
    @AuraEnabled
    public ReviewFeedback__c reviewFeedback {get; set;}
    @AuraEnabled
    public List<FeedbackItem> items {get; set;}

    public class FeedbackItem {
        @AuraEnabled
        public Id id {get; set;}
        @AuraEnabled
        public String fieldName;
        @AuraEnabled
        public String fieldType;
        @AuraEnabled
        public String instructions;
        @AuraEnabled
        public String comment {get; set;}
        @AuraEnabled
        public Object value;
        @AuraEnabled
        public String assessment {get; set;}
    }
}