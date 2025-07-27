public class ReviewSelectedFieldsWrapper {
    public String selectedSObject;
    public List<SelectedField> selectedFields;

    public class SelectedField {
        public String field;
        public String helptext;
    }
}
