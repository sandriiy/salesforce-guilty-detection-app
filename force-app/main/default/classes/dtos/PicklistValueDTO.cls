public class PicklistValueDTO {
    @AuraEnabled 
    public String label;
    @AuraEnabled 
    public String value;

    public PicklistValueDTO(String label, String value) {
        this.label = label;
        this.value = value;
    }
}