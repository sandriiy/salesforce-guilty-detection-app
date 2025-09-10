public class ReviewProcessNextStepDTO {
    @AuraEnabled 
    public String name;
    @AuraEnabled 
    public Boolean isReady;
    @AuraEnabled 
    public String messageType;
    @AuraEnabled 
    public String helpText;

    public ReviewProcessNextStepDTO(String name, Boolean isReady, String messageType, String helpText) {
        this.name = name;
        this.isReady = isReady;
        this.helpText = helpText;
        this.messageType = messageType;
    }
}