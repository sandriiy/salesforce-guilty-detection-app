# Technical Details and Best Practices — Admin Review Process Analytics Dashboard

## 1. Core Instruction for AI Agent

Before writing any code, inspect the existing implementation.

The Agent must review the current `adminReviewProcessDashboard` component and related Apex code before making changes.

The goal is to **extend the existing component**, not create a new one.

The Agent must first identify:

- How `adminReviewProcessDashboard` currently loads data.
- How Chart.js is imported and initialized.
- How `chartUtils` is currently used.
- Which Apex methods are already called.
- Which data structures are already expected by the UI.
- Which existing patterns should be preserved.
- Which parts can be generalized without breaking current behavior.

Only after this exploration should the Agent propose and implement changes.

## 2. Existing Component Requirement

Use the existing component:

**`adminReviewProcessDashboard`**

Do not create a new LWC with a similar purpose.

Allowed work:

- Refactor the existing component where needed.
- Extract reusable JavaScript helpers where useful.
- Extend current UI controls.
- Extend current Chart.js configuration logic.
- Reuse and improve `chartUtils`.
- Add supporting child components only when they reduce complexity and have a clear responsibility.

Not allowed:

- Creating a second dashboard that duplicates `adminReviewProcessDashboard`.
- Replacing the existing dashboard without preserving current behavior.
- Copying existing chart logic into a new component.
- Hardcoding the new logic to only one object or one review process.

## 3. Apex Architecture

### 3.1 Existing Controller

Use the existing Apex controller:

**`GuiltyAdminController`**

This controller should remain an orchestration layer only.

The controller is responsible for:

- Receiving requests from the LWC.
- Calling the appropriate service classes.
- Returning DTOs/wrappers to the LWC.
- Handling high-level request validation.
- Keeping the public API stable for the component.

The controller must not contain complex business logic, dynamic query-building logic, relationship-discovery logic, or dataset-preparation logic.

### 3.2 New Apex Service Classes

Create a separate Apex class or a small set of focused Apex classes for chart-related logic.

Suggested responsibilities:

#### `GuiltyChartAnalyticsService`

Responsible for preparing chart-ready datasets.

#### `GuiltyChartMetadataService`

Responsible for describing available objects, fields, relationships, and supported grouping/filtering options.

#### `GuiltyChartRelationshipService`

Responsible for discovering standard and custom relationship paths, including lookup, master-detail, and text-based Salesforce ID references.

#### `GuiltyChartQueryService` or `GuiltyChartQueryBuilder`

Responsible for constructing safe, validated, dynamic SOQL queries.

Use these names only if they fit the existing codebase naming style. Prefer consistency with the existing project over introducing a new naming convention.

## 4. Relationship Discovery

The solution must support more than standard Salesforce relationships.

### 4.1 Standard Relationships

Use Salesforce metadata to identify:

- Lookup fields.
- Master-detail fields.
- Child relationships.
- Field accessibility.
- Object accessibility.

### 4.2 Polymorphic-Style Custom References

Support fields that store Salesforce record IDs as text.

Example:

`ReviewFeedback__c.RecordId__c`

This field should be treated as a custom polymorphic-style reference because it can point to records from different sObject types.

The implementation should be able to:

- Match text field values against selected parent record IDs.
- Determine possible sObject types from record ID prefixes where practical.
- Filter records by selected base object type.
- Clearly represent this as an ID-based reference path, not as a real Salesforce relationship.

### 4.3 Configurable ID-Based References

The design should allow future support for other fields that behave like `ReviewFeedback__c.RecordId__c`.

Avoid hardcoding all behavior specifically to that one field.

It is acceptable to include `ReviewFeedback__c.RecordId__c` as a known default reference field for this application, but the architecture should support adding more fields later.

## 5. Dataset and Query Rules

Dynamic queries must be safe, validated, and security-aware.

The Agent must:

- Validate object API names against describe metadata.
- Validate field API names against describe metadata.
- Enforce object-level access.
- Enforce field-level access.
- Avoid string concatenation with unvalidated user input.
- Use bind variables wherever possible.
- Limit queried fields to only what is required.
- Apply reasonable limits to prevent large, slow queries.
- Design for pagination or progressive loading where datasets may become large.
- Return clear errors when the selected configuration is invalid.

The result returned to the LWC should be chart-ready or easy for the client to transform with minimal logic.

## 6. DTO / Wrapper Design

Use clear request and response wrappers between LWC and Apex.

Suggested request shape:

- Base object API name.
- Selected dataset source.
- Selected relationship path.
- Group-by field.
- Aggregation type.
- Optional aggregation field.
- Filter conditions.
- Date range.
- Chart type.
- Limit / page size where needed.

Suggested response shape:

- Labels.
- Datasets.
- Chart type.
- Metadata about grouping.
- Metadata about filters.
- Warnings, if any.
- Relationship path used.
- Source object used.
- Whether the source is a standard relationship or ID-based reference.

Use meaningful names. Avoid generic names like `data`, `result`, `wrapper`, or `obj` when a more specific name is possible.

## 7. LWC Best Practices

Use the best available LWC capabilities and Salesforce platform features.

Expected practices:

- Reuse the existing `adminReviewProcessDashboard` component.
- Reuse existing `chartUtils` where possible.
- Keep Chart.js lifecycle management clean.
- Destroy and recreate chart instances safely when configuration changes.
- Avoid unnecessary rerenders.
- Use reactive properties intentionally.
- Use getters for derived display state when appropriate.
- Use debouncing for filter/search inputs that can trigger server calls.
- Show loading and error states clearly.
- Keep the UI accessible and understandable.
- Prefer Lightning Base Components where they fit.
- Keep the client-side state predictable.
- Avoid putting heavy data-processing logic into the component when Apex can prepare the dataset more safely.
- Avoid putting Apex-only business rules into JavaScript.

Use Lightning Data Service, UI API, GraphQL, or wire adapters where they fit the use case. Use Apex where dynamic metadata, dynamic SOQL, complex relationship discovery, or server-side security validation is required.

## 8. Chart.js Rules

Chart.js must remain the chart rendering library.

The Agent must:

- Reuse the existing Chart.js loading approach unless there is a clear reason to change it.
- Reuse or extend `chartUtils`.
- Keep chart configuration generation modular.
- Validate chart type before rendering.
- Ensure selected chart type is compatible with the returned dataset.
- Avoid duplicating Chart.js configuration logic across files.
- Handle empty datasets gracefully.
- Handle chart refreshes without memory leaks.

## 9. Naming Standards

Use meaningful, intention-revealing names.

Good examples:

- `baseObjectApiName`
- `selectedRelationshipPath`
- `chartDatasetResponse`
- `groupByFieldApiName`
- `idReferenceFieldApiName`
- `relationshipDiscoveryResult`
- `availableChartTypes`
- `filterConditions`
- `sourceObjectApiName`

Avoid vague names:

- `data`
- `temp`
- `result`
- `obj`
- `thing`
- `stuff`
- `map1`
- `list1`
- `wrapper`

Generic names are acceptable only when the scope is tiny and the meaning is obvious.

## 10. Duplication Rules

Avoid unnecessary duplication.

The Agent must:

- Reuse existing `chartUtils`.
- Reuse existing dashboard logic where practical.
- Extract shared behavior instead of copying it.
- Avoid duplicate Apex describe logic.
- Avoid duplicate chart configuration logic.
- Avoid duplicate filter parsing logic.
- Avoid duplicate DTOs with the same purpose.

If similar logic already exists, extend it or extract it into a shared helper.

## 11. Comments Policy

Do not add new code comments unless explicitly requested.

The implementation should be self-explanatory through:

- Clear class names.
- Clear method names.
- Clear variable names.
- Small focused methods.
- Focused DTOs.
- Documentation in markdown files where needed.

Do not add comments that explain obvious code behavior.

If a comment is absolutely necessary because the business reason is not obvious, it must explain **why** the logic exists, not what the code is doing. However, the default expectation is that no new comments are added.

## 12. Modularity and Maintainability

Keep the implementation modular and extensible.

The Agent should prefer:

- Small focused Apex classes.
- Small focused JavaScript helper functions.
- Clear DTOs.
- Reusable metadata structures.
- Clear separation between UI state, chart configuration, metadata discovery, and dataset preparation.

The Agent should avoid:

- Large methods with multiple responsibilities.
- Hardcoded object-specific logic spread across the codebase.
- Dashboard-specific logic inside generic utilities.
- Query-building directly inside the LWC.
- Business logic directly inside `GuiltyAdminController`.

## 13. Security and Governance

The solution must respect Salesforce security and governor limits.

The Agent must account for:

- CRUD.
- FLS.
- Sharing model.
- Query row limits.
- Heap usage.
- CPU time.
- SOQL limits.
- Large datasets.
- Invalid or inaccessible objects and fields.
- User-provided configuration that could produce unsafe or expensive queries.

Use `with sharing`, inherited sharing, or the existing project standard consistently.

Return useful errors to the UI when access is denied or a selected field/object cannot be used.

## 14. AI Agent Development Workflow

The Agent should follow this workflow:

1. Inspect the existing `adminReviewProcessDashboard` component.
2. Inspect existing `chartUtils`.
3. Inspect `GuiltyAdminController`.
4. Inspect related review-process objects and fields.
5. Identify current behavior that must be preserved.
6. Identify reusable code.
7. Propose a short implementation plan.
8. Implement the smallest safe change first.
9. Keep changes modular.
10. Validate that existing behavior still works.
11. Add or update tests where appropriate.
12. Explain what was changed and what existing functionality was reused.

The Agent must not skip directly to implementation without understanding the current codebase.

## 15. Testing Expectations

Add or update tests where appropriate.

Expected coverage areas:

- Metadata discovery for standard relationships.
- Discovery of ID-based reference fields.
- Dataset generation for `ReviewFeedback__c.RecordId__c`.
- Validation of invalid object names.
- Validation of invalid field names.
- Security behavior for inaccessible fields.
- Empty dataset responses.
- Unsupported chart type handling.
- Existing dashboard behavior after enhancement.

Use existing project testing patterns and naming conventions.

## 16. Definition of Done

The work is complete when:

- `adminReviewProcessDashboard` is enhanced and still works.
- No duplicate dashboard component is created.
- Chart.js is still used.
- Existing `chartUtils` is reused or extended.
- `GuiltyAdminController` remains an orchestration layer only.
- Chart-related Apex logic lives in separate service classes.
- Standard relationships are supported.
- Text-based ID references are supported.
- `ReviewFeedback__c.RecordId__c` is supported.
- Admins can configure base object, grouping, filtering, and chart type.
- The implementation is generic enough to support other objects and future ID-based references.
- Security and governor limits are considered.
- No unnecessary comments are added.
- Meaningful names are used.
- Existing functionality is explored and preserved.
