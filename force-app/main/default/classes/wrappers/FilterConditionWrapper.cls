// This class is used to represent filter conditions for SObject queries
public class FilterConditionWrapper {
    // index -> the index of the filter in the filter logic 
    // field -> the name of the field to filter on
    // condition ->  The condition to apply (e.g., equals, notEqual, etc.)
    // value -> The value to compare against
    public Integer index {get; set;}
    public String field {get;set;}
    public String condition {get;set;}
    public String value {get;set;}

    // Constructor to initialize the filter condition
    public FilterConditionWrapper(Integer index, String field, String condition, String value){
        this.index = index;
        this.field = field;
        this.condition = condition;
        this.value = value;
    } 
}