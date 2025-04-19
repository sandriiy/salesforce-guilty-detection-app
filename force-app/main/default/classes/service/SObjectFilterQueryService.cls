public class SObjectFilterQueryService {
    public static List<sObject> getFilteredRecords(String sObjectName, List<FilterConditionWrapper> filterConditions, String filterLogic, Integer recordSize){
       
       try{
         //build the where clause
           String whereCaluse = buildWhereClause(filterConditions, filterLogic);


           //query 
           String query = 'Select Id From ' +  sObjectName + ' Where ' + whereCaluse;
           System.debug('Query: ' + query);

           if(recordSize != null){
              query += ' LIMIT ' + recordSize;
           }

           return Database.query(query);
       }
       catch (Exception ex) {
            System.debug('Error: ' + ex.getMessage());
            return new List<SObject>();
        }

       
    }
    //build a where clause based on the filter logic and filter condition that given in the wrapper

    public static String buildWhereClause(List<FilterConditionWrapper> filters, String filterLogic ){
       //assign the map of filter expression 
        Map<Integer,String> filterExperssion = new Map<Integer,String>();
        

        //loop through list of filters and put in the map
        for(FilterConditionWrapper filter : filters){
            //get the expersision 
            String expression = buildFilterExpression(filter);
             filterExperssion.put(filter.index, expression);
        }

        //replace each index in the filter logic

        for(Integer index : filterExperssion.keySet()){
            filterLogic = filterLogic.replace(String.valueOf(index), filterExperssion.get(index));
        }
        return filterLogic;

    }


    
    //method for Filter conditions 
    public static String buildFilterExpression(FilterConditionWrapper filters){
        String field = filters.field;
        String condition = filters.condition;
        String value = filters.value;

        switch on condition{
            when 'equals'{
                return field + ' = \'' + value + '\'';
            }
        }

        return 'Error';
    }

    
}