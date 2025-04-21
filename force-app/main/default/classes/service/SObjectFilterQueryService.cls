public class SObjectFilterQueryService {
    public static List<sObject> getFilteredRecords(String sObjectName, List<FilterConditionWrapper> filterConditions, String filterLogic, Integer recordSize){
       
       try{
           //validate the inputs
           if(String.isBlank(sObjectName)){
             throw new IllegalArgumentException('SObject Name Cannot be Blank.');
           }
           if (filterConditions == null || filterConditions.isEmpty()) {
            throw new IllegalArgumentException('Filter Conditions list cannot be empty.');
        }
        if (String.isBlank(filterLogic)) {
            throw new IllegalArgumentException('Filter Logic cannot be blank.');
        }



         //build the where clause
           String whereCaluse = buildWhereClause(filterConditions, filterLogic, sObjectName);
       

           //query 
           String query = 'Select Id From ' +  sObjectName + ' Where ' + whereCaluse;
           System.debug('Query: ' + query);

           if(recordSize != null){
              query += ' LIMIT ' + recordSize;
           }
           //execute the query
           List<SObject> allRecords= Database.query(query);
           if(allRecords.isEmpty()){
             throw new SObjectFilterQueryException('No Records Found for the given filters');
           }

           return allRecords;
       }
       
       catch (Exception e) {
        // Handle general errors
        System.debug('Error: ' + e.getMessage());
        throw new SObjectFilterQueryException('An error occurred while processing the query: ' + e.getMessage());
    }

       
    }
    //build a where clause based on the filter logic and filter condition that given in the wrapper

    public static String buildWhereClause(List<FilterConditionWrapper> filters, String filterLogic, String sObjectName ){
        try{
       //assign the map of filter expression 
        Map<Integer,String> filterExperssion = new Map<Integer,String>();
        

        //loop through list of filters and put in the map
        for(FilterConditionWrapper filter : filters){
            //get the expersision 
            String expression = buildFilterExpression(filter, sObjectName);
             filterExperssion.put(filter.index, expression);
        }

        //replace each index in the filter logic

        for(Integer index : filterExperssion.keySet()){
            filterLogic = filterLogic.replace(String.valueOf(index), filterExperssion.get(index));
        }
        return filterLogic;  
     }
     catch(Exception e){
         throw new SObjectFilterQueryException ('Error While Processing Where Clause'+ e.getMessage());
     }

    }


    
    //method for Filter conditions 
    public static String buildFilterExpression(FilterConditionWrapper filters, String sObjectName){
        try{
        String field = filters.field;
        String condition = filters.condition;
        String value = processValue(filters.field, filters.value, sObjectName);

        switch on condition{
            when 'equals'{
                return field + ' = ' + value;
            } when 'notEqual'{
                return field + ' != ' + value;
            } when 'greaterThan'{
                return field + ' > ' + value;
            } when 'lessThan'{
                return field +  ' < ' + value;
            } when 'greaterOrEqualTo'{
                return field + ' >= ' + value;
            } when 'lessOrEqualTo'{
                return field + ' <= ' + value;
            } when 'isNull'{
                return field + ' = NULL';
            } when 'contains'{
                return field + ' LIKE \'%' + String.escapeSingleQuotes(value) + '%\'';
            } when 'doesNotContain'{
                return field + ' NOT LIKE \'%' + String.escapeSingleQuotes(value) + '%\'';
            } when 'startsWith'{
                return field + ' LIKE \'' + String.escapeSingleQuotes(value) + '%\'';
            } when 'endsWith'{
                return field + ' LIKE \'' + String.escapeSingleQuotes(value) + ' \'';         
             }
             when 'before'{
                return field + ' < ' + value;
             } when 'after'{
                return field + ' > ' + value;
             }
             when else{
                throw new IllegalArgumentException('Unsupported Condition ' + condition);
             }            
        }
      
    }catch(Exception e){
        throw new SObjectFilterQueryException('Errors While Processing Filter Expressions ' + e.getMessage());
    }

      
    }

    //helper method 
   private static String processValue(String field, String value, String objectName){


      try{
        Schema.SobjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
        Schema.DescribeSObjectResult sObjectDescribe = sObjectType.getDescribe();
        Schema.DescribeFieldResult fieldDescribe = sObjectDescribe.fields.getMap().get(field).getDescribe();

        //take the field type
        Schema.DisplayType fieldType = fieldDescribe.getType();


        switch on fieldType {
            when Date, DateTime{
                return value;
            }
            when Boolean{
                return value;
            }
            when Currency, Double, Integer,Percent{

                return value;
            }when else{
                return '\'' + String.escapeSingleQuotes(value) + '\'';    
            }
        }
      }
      catch (Exception e) {
        throw new SObjectFilterQueryException('Error processing value for field "' + field + '": ' + e.getMessage());
    }

   }

   //custom exception
public class SObjectFilterQueryException extends Exception {

}
  
}

