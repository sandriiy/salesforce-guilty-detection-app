public inherited sharing class SObjectFilterQueryBuilder {
    private String sobjectName;
    private List<FilterConditionWrapper> filters = new List<FilterConditionWrapper>();
    private String logic;
    private List<String> selectFields = new List<String>();
    private Integer limitSize;
    private String orderByClause;

    /**
     * Create a new service for a specific sObject API name (e.g., "Case", "Account").
     * This is the required entry point for configuring and executing the query.
     */
    public SObjectFilterQueryBuilder(String sobjectName) {
        this.sobjectName = sobjectName;
    }

    /**
     * Provide the full list of filters.
     */
    public SObjectFilterQueryBuilder withFilters(List<FilterConditionWrapper> filters) {
        this.filters = filters == null
            ? new List<FilterConditionWrapper>()
            : new List<FilterConditionWrapper>(filters);
		
        return this;
    }

    /**
     * Add a single filter.
     */
    public SObjectFilterQueryBuilder addFilter(FilterConditionWrapper filter) {
        if (this.filters == null) {
            this.filters = new List<FilterConditionWrapper>();
        }

        this.filters.add(filter);
        return this;
    }

    /**
     * Provide the filter logic string (e.g., "0 AND (1 OR 2)").
     */
    public SObjectFilterQueryBuilder withLogic(String logic) {
        this.logic = logic;
        return this;
    }

    /**
     * Provide the explicit field list to SELECT.
     */
    public SObjectFilterQueryBuilder withFields(List<String> fieldApiNames) {
        this.selectFields = fieldApiNames == null
            ? new List<String>()
            : new List<String>(fieldApiNames);
		
        return this;
    }

    /**
     * Add a single field to SELECT.
     */
    public SObjectFilterQueryBuilder addField(String fieldApiName) {
        if (this.selectFields == null) {
            this.selectFields = new List<String>();
        }

        this.selectFields.add(fieldApiName);
        return this;
    }

    /**
     * Optional LIMIT value. Omit to run with no LIMIT.
     */
    public SObjectFilterQueryBuilder withLimit(Integer limitSize) {
        this.limitSize = limitSize;
        return this;
    }

    /**
     * Optional ORDER BY clause (raw SOQL fragment like "CreatedDate DESC, Name ASC").
     */
    public SObjectFilterQueryBuilder orderBy(String orderByClause) {
        this.orderByClause = orderByClause;
        return this;
    }

    /**
     * Build SOQL using the provided configuration and return a Database.Cursor inside Result.
     * On error, returns Result.success=false and a descriptive message instead of throwing.
     */
    public Result run() {
        Result validationResult = validate();
        if (validationResult != null) {
            return validationResult;
        }

        Schema.SObjectType sobjectType = Schema.getGlobalDescribe().get(this.sobjectName);
        if (sobjectType == null) {
            return new Result('Invalid sObject: ' + this.sobjectName, null);
        }

        Schema.DescribeSObjectResult sobjectDescribe = sobjectType.getDescribe();
        Map<String, Schema.SObjectField> describeFieldMap = sobjectDescribe.fields.getMap();

        String whereClause = buildWhereClause(describeFieldMap);

        Set<String> finalFieldSet = new Set<String>();
        if (this.selectFields != null && !this.selectFields.isEmpty()) {
            for (String requestedField : this.selectFields) {
                if (!describeFieldMap.containsKey(requestedField)) {
                    return new Result('Field "' + requestedField + '" does not exist on ' + this.sobjectName + '.', null);
                }
                finalFieldSet.add(requestedField);
            }
        }

        if (finalFieldSet.isEmpty()) {
            finalFieldSet.add('Id');
        }

		String soql = 'SELECT ' + String.join(new List<String>(finalFieldSet), ', ')
					+ ' FROM ' + this.sobjectName
					+ ' WHERE ' + whereClause;

		if (!String.isBlank(this.orderByClause)) {
			soql += ' ORDER BY ' + this.orderByClause;
		}

		if (this.limitSize != null && this.limitSize > 0) {
			soql += ' LIMIT ' + String.valueOf(this.limitSize);
		}

        try {
            Database.Cursor cursor = Database.getCursor(soql);
            return new Result(cursor, soql);
        } catch (Exception ex) {
            return new Result('Invalid query: ' + ex.getMessage(), soql);
        }
    }

    private Result validate() {
        if (String.isBlank(this.sobjectName)) {
            return new Result('sObject Name cannot be blank.', null);
        }

        if (this.filters == null || this.filters.isEmpty()) {
            return new Result('Filter Conditions list cannot be empty or null.', null);
        }

        if (String.isBlank(this.logic)) {
            return new Result('Filter Logic cannot be blank.', null);
        }

        return null;
    }

    private String buildWhereClause(Map<String, Schema.SObjectField> describeFieldMap) {
        Map<Integer, String> expressionByIndex = new Map<Integer, String>();

        for (FilterConditionWrapper filterCondition : this.filters) {
            if (filterCondition == null) continue;

            if (!describeFieldMap.containsKey(filterCondition.field)) {
                throw new SObjectFilterQueryException('Invalid field "' + filterCondition.field + '" on ' + this.sobjectName);
            }

            Schema.DescribeFieldResult fieldDescribe = describeFieldMap.get(filterCondition.field).getDescribe();
            String filterExpression = buildFilterExpression(filterCondition, fieldDescribe);
            expressionByIndex.put(filterCondition.index, '(' + filterExpression + ')');
        }

        String resolvedLogic = this.logic;
        for (Integer filterIndex : expressionByIndex.keySet()) {
            String indexToken = String.valueOf(filterIndex);
            Pattern indexPattern = Pattern.compile('\\b' + indexToken + '\\b');
            Matcher indexMatcher = indexPattern.matcher(resolvedLogic);
            resolvedLogic = indexMatcher.replaceAll(expressionByIndex.get(filterIndex));
        }

        return resolvedLogic;
    }

    private String buildFilterExpression(FilterConditionWrapper filterCondition, Schema.DescribeFieldResult fieldDescribe) {
        String fieldApiName = filterCondition.field;
        String conditionName = filterCondition.condition == null ? '' : filterCondition.condition.trim().toLowerCase();
        String rawValue = filterCondition.value;

        if (conditionName == 'isnull') {
            return fieldApiName + ' = NULL';
        }

        if (conditionName == 'isempty') {
            Boolean shouldBeEmpty = false;
            if (rawValue != null) {
                String normalized = rawValue.trim().toLowerCase();
                shouldBeEmpty = (normalized == 'true' || normalized == '1' || normalized == 'yes');
            }
            String emptinessExpr = '(' + fieldApiName + ' = NULL OR ' + fieldApiName + ' = \'\')';
            return shouldBeEmpty ? emptinessExpr : 'NOT ' + emptinessExpr;
        }

        FieldLiteral fieldLiteral = toLiteral(rawValue, fieldDescribe);

        switch on conditionName {
            when 'equals'           { return equalsExpression(fieldApiName, fieldLiteral); }
            when 'notequal'         { return notEqualsExpression(fieldApiName, fieldLiteral); }
            when 'greaterthan'      { return comparisonOrNullGuard(fieldApiName, '>', fieldLiteral); }
            when 'lessthan'         { return comparisonOrNullGuard(fieldApiName, '<', fieldLiteral); }
            when 'greaterorequalto' { return comparisonOrNullGuard(fieldApiName, '>=', fieldLiteral); }
            when 'lessorequalto'    { return comparisonOrNullGuard(fieldApiName, '<=', fieldLiteral); }
            when 'before'           { return comparisonOrNullGuard(fieldApiName, '<', fieldLiteral); }
            when 'after'            { return comparisonOrNullGuard(fieldApiName, '>', fieldLiteral); }
            when 'contains'         { return likeClause(fieldApiName, '%' + fieldLiteral.patternText + '%'); }
            when 'doesnotcontain'   { return 'NOT ' + likeClause(fieldApiName, '%' + fieldLiteral.patternText + '%'); }
            when 'startswith'       { return likeClause(fieldApiName, fieldLiteral.patternText + '%'); }
            when 'endswith'         { return likeClause(fieldApiName, '%' + fieldLiteral.patternText); }
            when else               { throw new SObjectFilterQueryException('Unsupported condition: ' + filterCondition.condition); }
        }
    }

    private String equalsExpression(String fieldApiName, FieldLiteral fieldLiteral) {
        if (fieldLiteral.isNullValue) return fieldApiName + ' = NULL';
        return fieldApiName + ' = ' + fieldLiteral.sql;
    }

    private String notEqualsExpression(String fieldApiName, FieldLiteral fieldLiteral) {
        if (fieldLiteral.isNullValue) return fieldApiName + ' != NULL';
        return fieldApiName + ' != ' + fieldLiteral.sql;
    }

    private String comparisonOrNullGuard(String fieldApiName, String operatorSymbol, FieldLiteral fieldLiteral) {
        if (fieldLiteral.isNullValue) {
            return '(' + fieldApiName + ' = NULL)';
        }

        return fieldApiName + ' ' + operatorSymbol + ' ' + fieldLiteral.sql;
    }

    private String likeClause(String fieldApiName, String rawPattern) {
        return fieldApiName + ' LIKE \'' + rawPattern + '\'';
    }

    private FieldLiteral toLiteral(String rawValue, Schema.DescribeFieldResult fieldDescribe) {
        FieldLiteral result = new FieldLiteral();
        Schema.DisplayType displayType = fieldDescribe.getType();
        String trimmedValue = rawValue == null ? null : rawValue.trim();

        if (String.isBlank(trimmedValue)) {
            if (isTextLike(displayType)) {
                result.sql = '\'\'';
                result.patternText = '';
                result.isNullValue = true;
            } else {
                result.sql = 'NULL';
                result.patternText = '';
                result.isNullValue = true;
            }

            return result;
        }

        if (displayType == Schema.DisplayType.Boolean) {
            Boolean parsedBoolean = (trimmedValue.toLowerCase() == 'true' || trimmedValue == '1' || trimmedValue.toLowerCase() == 'yes');
            result.sql = parsedBoolean ? 'TRUE' : 'FALSE';
            result.patternText = parsedBoolean ? 'TRUE' : 'FALSE';
            result.isNullValue = false;
            return result;
        }

        if (displayType == Schema.DisplayType.Date) {
            try {
                Date parsedDate = Date.valueOf(trimmedValue);
                result.sql = String.valueOf(parsedDate);
                result.patternText = result.sql;
                result.isNullValue = false;
                return result;
            } catch (Exception ignore) {
                result.sql = 'NULL';
                result.patternText = '';
                result.isNullValue = true;
                return result;
            }
        }

        if (displayType == Schema.DisplayType.DateTime) {
            try {
                if (trimmedValue.endsWith('Z')) {
                    String iso = trimmedValue;
                    if (iso.contains('.')) {
                        iso = iso.substring(0, iso.indexOf('.')) + 'Z';
                    }
                    result.sql = iso;
                } else {
                    Datetime parsedDateTime = Datetime.valueOf(trimmedValue);
                    result.sql = parsedDateTime.formatGmt('yyyy-MM-dd\'T\'HH:mm:ss\'Z\'');
                }

                result.patternText = result.sql;
                result.isNullValue = false;
                return result;
            } catch (Exception ignore) {
                result.sql = 'NULL';
                result.patternText = '';
                result.isNullValue = true;
                return result;
            }
        }

        if (isNumericType(displayType)) {
            if (Pattern.matches('^[+-]?(\\d+\\.?\\d*|\\.\\d+)$', trimmedValue)) {
                result.sql = trimmedValue;
                result.patternText = trimmedValue;
                result.isNullValue = false;
            } else {
                result.sql = 'NULL';
                result.patternText = '';
                result.isNullValue = true;
            }

            return result;
        }

        String quoted = '\'' + String.escapeSingleQuotes(trimmedValue) + '\'';
        result.sql = quoted;
        result.patternText = trimmedValue;
        result.isNullValue = false;
        return result;
    }

    private Boolean isNumericType(Schema.DisplayType displayType) {
        return (displayType == Schema.DisplayType.Integer
            || displayType == Schema.DisplayType.Long
            || displayType == Schema.DisplayType.Double
            || displayType == Schema.DisplayType.Currency
            || displayType == Schema.DisplayType.Percent);
    }

    private Boolean isTextLike(Schema.DisplayType displayType) {
        return (displayType == Schema.DisplayType.String
            || displayType == Schema.DisplayType.Email
            || displayType == Schema.DisplayType.Phone
            || displayType == Schema.DisplayType.Url
            || displayType == Schema.DisplayType.TextArea
            || displayType == Schema.DisplayType.EncryptedString
            || displayType == Schema.DisplayType.Picklist
            || displayType == Schema.DisplayType.MultiPicklist
            || displayType == Schema.DisplayType.Reference
            || displayType == Schema.DisplayType.Id);
    }

    public class SObjectFilterQueryException extends Exception {}

    public class FieldLiteral {
        public String sql;
        public String patternText;
        public Boolean isNullValue;
    }

    public class Result {
        public Boolean success { get; private set; }
        public String errorMessage { get; private set; }
        public Database.Cursor cursor { get; private set; }
        public String soql { get; private set; }

        public Result(Database.Cursor cursor, String soql) {
            this.success = true;
            this.cursor = cursor;
            this.soql = soql;
        }
        public Result(String message, String soqlOpt) {
            this.success = false;
            this.errorMessage = message;
            this.soql = soqlOpt;
        }
    }
}