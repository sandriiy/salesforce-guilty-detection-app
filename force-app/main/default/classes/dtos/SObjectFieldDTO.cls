public class SObjectFieldDTO {
    @AuraEnabled
    public String label;
    @AuraEnabled
    public String name;
    @AuraEnabled
    public String referenceTo;
    @AuraEnabled
    public String type;

    public SObjectFieldDTO(String label, String name, String type, String referenceTo) {
        this.label = label;
        this.name = name;
        this.type = type;
        this.referenceTo = referenceTo;
    }
}