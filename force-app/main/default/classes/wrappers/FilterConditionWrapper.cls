
public class FilterConditionWrapper {
    public Integer index {get; set;}
    public String field {get;set;}
    public String condition {get;set;}
    public String value {get;set;}

    public FilterConditionWrapper(Integer index, String field, String condition, String value){
        this.index = index;
        this.field = field;
        this.condition = condition;
        this.value = value;
    } 
}