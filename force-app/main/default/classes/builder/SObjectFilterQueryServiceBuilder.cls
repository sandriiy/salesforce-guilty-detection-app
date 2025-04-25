public class SObjectFilterQueryServiceBuilder {
    
  private String sObjectName;
  private List<FilterConditionWrapper> filterConditions;
  private String filterLogic;

 private SObjectFilterQueryServiceBuilder(SObjectFilterQueryServiceBuilder.Builder builder){
     this.sObjectName = builder.sObjectName;
     this.filterConditions = builder.filterConditions;
     this.filterLogic = builder.filterLogic;
 }



 public String getSObjectName(){
    return this.sObjectName;      
 }

 public List<FilterConditionWrapper> getFilterConditions() {
  return filterConditions;
}

 public String getFilterLogic() {
  return filterLogic;
}


  public class Builder{
    private String sObjectName;
    private List<FilterConditionWrapper> filterConditions;
    private String filterLogic;


    public SObjectFilterQueryServiceBuilder.Builder setSObjectName(String sObjectName){
       this.sObjectName = sObjectName;
       return this;
    }

    public SObjectFilterQueryServiceBuilder.Builder setFilterConditions(List<FilterConditionWrapper> filterConditions){
      this.filterConditions = filterConditions;
      return this;
    }

    public SObjectFilterQueryServiceBuilder.Builder setFilterLogic(String filterLogic){
      this.filterLogic = filterLogic;
      return this;
    }

    private void validateInput(){
        if(String.isBlank(sObjectName)){
            throw new SObjectFilterQueryException('sObject Name cannot be blank');
      } if(filterConditions == null || filterConditions.isEmpty()){
        throw new SObjectFilterQueryException('Filter Conditions list cannot be empty or Null');
      } if(String.isBlank(filterLogic)){
        throw new SObjectFilterQueryException('Filter Logic Cannot be Blank');
      }
  }

  public SObjectFilterQueryServiceBuilder build(){
    validateInput();
    return new SObjectFilterQueryServiceBuilder(this);
  }
}


  public class SObjectFilterQueryException extends Exception {
  }

     

}