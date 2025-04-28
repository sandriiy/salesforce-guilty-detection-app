public class SObjectFilterQueryService {
    private String sObjectName;
    private List<FilterConditionWrapper> filterConditions;
    private String filterLogic;

    public SObjectFilterQueryService(String sObjectName, List<FilterConditionWrapper> filterConditions, String filterLogic) {
        this.sObjectName = sObjectName;
        this.filterConditions = filterConditions;
        this.filterLogic = filterLogic;
    }


    public String getSObjectName() {
        return this.sObjectName;
    }

    public List<FilterConditionWrapper> getFilterConditions() {
        return this.filterConditions;
    }

    public String getFilterLogic() {
        return this.filterLogic;
    }

    public SObjectFilterQueryService setSObjectName(String sObjectName) {
        this.sObjectName = sObjectName;
        return this;
    }

    public SObjectFilterQueryService setFilterConditions(List<FilterConditionWrapper> filterConditions) {
        this.filterConditions = filterConditions;
        return this;
    }

    public SObjectFilterQueryService setFilterLogic(String filterLogic) {
        this.filterLogic = filterLogic;
        return this;
    }

    public Database.Cursor build() {
        validateInput();
        return getFilteredRecords(this);
    }

    public Database.Cursor getFilteredRecords(SObjectFilterQueryService builder) {
        String sObjectName = builder.getSObjectName();
        List<FilterConditionWrapper> filterConditions = builder.getFilterConditions();
        String filterLogic = builder.getFilterLogic();

        String whereClause = buildWhereClause(builder);
        String query = 'SELECT Id FROM ' + sObjectName + ' WHERE ' + whereClause;

        try {
            return Database.getCursor(query);
        } catch (Exception e) {
            throw new QueryException('Invalid query: ' + e.getMessage());
        }
    }

    private String buildWhereClause(SObjectFilterQueryService builder) {
        String sObjectName = builder.getSObjectName();
        List<FilterConditionWrapper> filterConditions = builder.getFilterConditions();
        String filterLogic = builder.getFilterLogic();
        String workingFilterLogic  = filterLogic;

        Map<Integer, String> filterExpressions = new Map<Integer, String>();

        for (FilterConditionWrapper filter : filterConditions) {
            String expression = buildFilterExpression(filter, sObjectName);
            filterExpressions.put(filter.index, expression);
        }

        for (Integer index : filterExpressions.keySet()) {
            workingFilterLogic = workingFilterLogic.replace(String.valueOf(index), filterExpressions.get(index));
        }
        return workingFilterLogic;
    }

    private String buildFilterExpression(FilterConditionWrapper filter, String sObjectName) {
        String field = filter.field;
        String condition = filter.condition;
        String value = processValue(field, filter.value, sObjectName);

        switch on condition {
            when 'equals' {
                return field + ' = ' + value;
            }
            when 'notEqual' {
                return field + ' != ' + value;
            }
            when 'greaterThan' {
                return field + ' > ' + value;
            }
            when 'lessThan' {
                return field + ' < ' + value;
            }
            when 'greaterOrEqualTo' {
                return field + ' >= ' + value;
            }
            when 'lessOrEqualTo' {
                return field + ' <= ' + value;
            }
            when 'isNull' {
                return field + ' = NULL';
            }
            when 'contains' {
                return field + ' LIKE \'%' + String.escapeSingleQuotes(value) + '%\'';
            }
            when 'doesNotContain' {
                return field + ' NOT LIKE \'%' + String.escapeSingleQuotes(value) + '%\'';
            }
            when 'startsWith' {
                return field + ' LIKE \'' + String.escapeSingleQuotes(value) + '%\'';
            }
            when 'endsWith' {
                return field + ' LIKE \'%' + String.escapeSingleQuotes(value) + '\'';
            }
            when 'before' {
                return field + ' < ' + value;
            }
            when 'after' {
                return field + ' > ' + value;
            }
            when else {
                throw new IllegalArgumentException('Unsupported condition: ' + condition);
            }
        }
    }

    private String processValue(String field, String value, String objectName) {
        try {
            Schema.SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
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
            throw new System.TypeException('Invalid field "' + field + '": ' + e.getMessage());
        }
    }

    private void validateInput() {
        if (String.isBlank(sObjectName)) {
            throw new SObjectFilterQueryException('sObject Name cannot be blank');
        }
        if (filterConditions == null || filterConditions.isEmpty()) {
            throw new SObjectFilterQueryException('Filter Conditions list cannot be empty or null');
        }
        if (String.isBlank(filterLogic)) {
            throw new SObjectFilterQueryException('Filter Logic cannot be blank');
        }
    }

    public class SObjectFilterQueryException extends Exception {
    }

    
}
