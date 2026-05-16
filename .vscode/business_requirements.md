# Business Requirements — Admin Review Process Analytics Dashboard

## 1. Context

The Salesforce application **Find The Guilty** allows org admins to create review processes for specific Salesforce records and verify whether selected fields comply with configured policies, standards, or internal rules.

Admins can define review instructions at two levels:

- **Process level** — instructions that apply to the overall review process.
- **Field level** — instructions that apply to specific fields included in the review.

Reviewers can be assigned either explicitly by admins or through permissions. Reviewers then inspect the configured records and fields and provide review feedback.

The application already includes setup and review experiences, including the existing Lightning Web Component:

**`adminReviewProcessDashboard`**

This existing component is the required starting point for the new analytics functionality.

## 2. Goal

Enhance the existing **`adminReviewProcessDashboard`** component so it can work as a reusable analytics and charting dashboard for review-process data.

The component should behave similarly to a standard Salesforce report or dashboard, but with more flexibility. It must allow admins to analyze related datasets even when relationships are not defined through standard Salesforce lookup or master-detail fields.

The component must support analytics based on:

- Standard lookup relationships.
- Master-detail relationships.
- Custom relationship patterns.
- Polymorphic-style references.
- Text fields that store Salesforce record IDs, such as `ReviewFeedback__c.RecordId__c`.

The final result should be generic and reusable enough that it can later be moved into a separate repository and used outside of this specific project.

## 3. Important Product Direction

Do **not** create a new dashboard component.

The work must be based on the existing **`adminReviewProcessDashboard`** component.

The AI Agent must first explore the current implementation, understand how the existing dashboard works, and then extend it in a clean, maintainable way.

The Agent must specifically review:

- Existing `adminReviewProcessDashboard` JavaScript, HTML, CSS, metadata, and tests.
- Current Chart.js setup.
- Existing `chartUtils` usage.
- Current Apex controller methods used by the dashboard.
- Existing review-process objects and fields.
- Existing data loading, state handling, and rendering patterns.

Development must not begin until the existing behavior and reusable pieces have been identified.

## 4. Target Users

### Primary users

Salesforce org admins who configure and monitor review processes.

### Secondary users

Technical admins, consultants, and developers who need deeper insight into review-process data, review feedback, compliance results, and related records.

## 5. Main User Story

As a Salesforce admin, I want to select a base Salesforce object and dynamically analyze related review-process data, so that I can understand patterns, exceptions, reviewer activity, policy failures, and record-level issues without building a separate custom report for every scenario.

## 6. Key Capabilities

### 6.1 Select a Base Object

Admins must be able to define the parent sObject type used as the base for analysis.

Example base objects may include:

- `Account`
- `Contact`
- `Opportunity`
- Custom objects used by the Find The Guilty application
- Any other supported sObject available to the org and allowed by security

The selected base object becomes the primary dataset context for the dashboard.

### 6.2 Discover Related Data

The component must automatically determine relevant relationships to the selected base object wherever possible.

Relationship discovery should include:

- Child relationships from Salesforce metadata.
- Lookup fields pointing to the selected base object.
- Master-detail fields pointing to the selected base object.
- Known review-process objects that reference records indirectly.
- Configurable or discoverable text fields that contain Salesforce record IDs.

The dashboard should not be limited to relationships that Salesforce exposes as formal lookup or master-detail relationships.

### 6.3 Support Polymorphic-Style References

The component must support custom polymorphic-style references.

A key example is:

`ReviewFeedback__c.RecordId__c`

This field stores a Salesforce record ID as text. It may refer to different sObject types depending on the record ID value.

The dashboard must be able to analyze records connected through this pattern by matching the text ID value to the selected base records.

The component should clearly distinguish between:

- Real Salesforce relationships.
- Polymorphic-style text references.
- Other configurable ID-based reference fields.

### 6.4 Build Dynamic Datasets

Admins must be able to build chart datasets dynamically from the selected object and related data.

The dashboard should support:

- Selecting the source object or related dataset.
- Selecting fields for grouping.
- Selecting fields for filtering.
- Selecting fields or counts for aggregation.
- Applying filter conditions.
- Refreshing chart data based on the selected configuration.

The first implementation can start with practical, high-value aggregations, but the design must allow more aggregation types later.

### 6.5 Provide Chart Controls

Admins must be able to choose the chart type supported by Chart.js and suitable for the selected dataset.

Expected chart types include common Chart.js options such as:

- Bar
- Line
- Pie
- Doughnut
- Radar
- Polar area
- Other chart types already supported by the existing Chart.js setup

The UI should prevent unsupported or invalid chart configurations where possible.

### 6.6 Provide Filtering and Grouping

The dashboard must provide UI controls for grouping and filtering data.

Examples:

- Group review feedback by status.
- Group records by reviewer.
- Group policy failures by field.
- Filter by review process.
- Filter by reviewer.
- Filter by date range.
- Filter by object type.
- Filter by compliance status.
- Filter by fields available on the selected dataset.

The component should make the available options understandable to admins and should avoid exposing confusing technical implementation details unless needed.

### 6.7 Work Like a Report, but More Flexible

The component should provide report-like behavior, but it must not be limited to standard Salesforce reporting relationships.

It should help admins answer questions such as:

- Which records have the most review feedback?
- Which fields fail review most often?
- Which reviewers identify the most issues?
- Which review processes generate the most failures?
- Which related records are connected through custom ID fields instead of real relationships?
- Which object types are most commonly referenced by polymorphic-style feedback records?

## 7. Expected Business Outcome

Admins should be able to analyze review-process data faster, with less custom development and fewer one-off reports.

The dashboard should make review-process issues easier to identify, explain, and act on.

The functionality should also create a foundation for future reusable analytics features in this application or in a separate open-source/shared repository.

## 8. Scope

### In scope

- Extend the existing `adminReviewProcessDashboard` component.
- Reuse existing Chart.js and `chartUtils` implementation where possible.
- Add dynamic object and dataset selection.
- Add relationship discovery.
- Add support for text-based record ID references.
- Add grouping and filtering controls.
- Add dynamic chart type selection.
- Add generalized Apex logic for chart metadata, query preparation, and dataset preparation.
- Keep the solution reusable and not tightly coupled to one object or one review process.

### Out of scope unless explicitly requested

- Creating a completely new dashboard component.
- Replacing Chart.js with another charting library.
- Building a full replacement for Salesforce Reports.
- Hardcoding the solution only for one object or one review process.
- Adding unrelated setup screens.
- Adding unnecessary comments to the codebase.
- Duplicating existing `chartUtils` or dashboard logic instead of reusing or extending it.

## 9. Success Criteria

The implementation is successful when:

- The existing `adminReviewProcessDashboard` component is enhanced.
- Admins can select a base sObject for analysis.
- The dashboard can discover and use standard Salesforce relationships.
- The dashboard can analyze records connected through text-based Salesforce ID fields.
- `ReviewFeedback__c.RecordId__c` is supported as a key polymorphic-style reference example.
- Admins can configure grouping, filtering, and chart type from the UI.
- Chart.js renders the selected dataset correctly.
- The implementation is generic, modular, and reusable.
- Existing dashboard behavior is preserved unless a change is explicitly required.
- The AI Agent can explain which existing code was reused and why.
- No unnecessary duplicate code is introduced.
- No new code comments are added unless explicitly requested.
