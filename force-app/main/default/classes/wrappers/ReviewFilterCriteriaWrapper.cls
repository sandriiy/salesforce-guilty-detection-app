public class ReviewFilterCriteriaWrapper {
    public String selectedSObject;
    public List<FilterField> selectedFilters;
    public String selectedFilterLogic;

    public class FilterField {
        public String field;
        public String type;
        public String value;
        public String selectedCondition;
        public String lookupTo;
        public Boolean isPicklist;
        public Boolean isLookup;
    }
}
