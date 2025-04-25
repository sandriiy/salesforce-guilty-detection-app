public class SObjectFilterQueryService {
    private String sObjectName;
    private List<FilterConditionWrapper> filterConditions;
    private String filterLogic;

    public SObjectFilterQueryService() {
        this.sObjectName = '';
        this.filterConditions = new List<FilterConditionWrapper>();
        this.filterLogic = '';
    }

    public Database.QueryLocator getFilteredRecords(SObjectFilterQueryServiceBuilder builder){
        sObjectName = builder.getSObjectName();
        filterConditions = builder.getFilterConditions();
        filterLogic = builder.getFilterLogic();
        
        String whereClause = buildWhereClause(builder);    
        String query = 'Select Id From ' +  sObjectName + ' Where ' + whereClause;
        
        try {
            return Database.getQueryLocator(query);
        } catch (Exception e) {
            throw new SObjectFilterQueryException('Invalid query: ' + e.getMessage());
        }
    }
    private String buildWhereClause(SObjectFilterQueryServiceBuilder builder){
        sObjectName = builder.getSObjectName();
        filterConditions = builder.getFilterConditions();
        filterLogic = builder.getFilterLogic();

        Map<Integer,String> filterExpressions = new Map<Integer,String>();
        
        for(FilterConditionWrapper filter : filterConditions){
            String expression = buildFilterExpression(filter, sObjectName);
            filterExpressions.put(filter.index, expression);
        }
        
        for(Integer index : filterExpressions.keySet()){
            filterLogic = filterLogic.replace(String.valueOf(index), filterExpressions.get(index));
        }
        return filterLogic;
        
    }
    
    private String buildFilterExpression(FilterConditionWrapper filters, String sObjectName){
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
                return field + ' LIKE \'' + String.escapeSingleQuotes(value) + '\'';
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
    }
    private String processValue(String field, String value, String objectName){
        try {
            Schema.SobjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
            Schema.DescribeFieldResult fieldDescribe = sObjectType.getDescribe().fields.getMap().get(field).getDescribe();
            Schema.DisplayType fieldType = fieldDescribe.getType();
            
            switch on fieldType {
                when Date, DateTime, Boolean, Currency, Double, Integer, Percent {
                    return value;
                }
                when else {
                    return '\'' + String.escapeSingleQuotes(value) + '\'';
                }
            }
        } catch (Exception e) {
            throw new SObjectFilterQueryException('Invalid field "' + field + '": ' + e.getMessage());
        }
    }
    
    public class SObjectFilterQueryException extends Exception {
        
    }
    
}