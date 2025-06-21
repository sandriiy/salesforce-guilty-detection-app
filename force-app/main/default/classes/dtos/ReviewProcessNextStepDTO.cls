public class ReviewProcessNextStepDTO {
    @AuraEnabled 
    public String name;
    @AuraEnabled 
    public Boolean isReady;

    public ReviewProcessNextStepDTO(String name, Boolean isReady) {
        this.name = name;
        this.isReady = isReady;
    }
}