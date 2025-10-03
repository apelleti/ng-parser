---
project: Angular Project
angular_version: unknown
total_entities: 10
total_relationships: 14
generated: 2025-10-03T08:13:45.061Z
---
# Angular Project Analysis

## Overview

- **Total Entities**: 10
- **Total Relationships**: 14
- **Analysis Date**: 10/3/2025, 10:13:45 AM



## Components (3)

### DashboardComponent
**File**: `/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/components/dashboard.component.ts:8`

Dashboard component
WARNING: Contains XSS vulnerability for demo

**Selector**: `app-dashboard`
---

### UserListComponent
**File**: `/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/components/user-list.component.ts:10`

User list component
WARNING: Intentional memory leak for demo purposes

**Selector**: `app-user-list`
**Type**: Standalone Component

**Lifecycle Hooks**: ngOnInit, ngOnDestroy
---

### AppComponent
**File**: `/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app.component.ts:9`

Main application component
Demonstrates standalone component with signals

**Selector**: `app-root`
**Type**: Standalone Component

**Inputs**:
- `title`: any

**Outputs**:
- `titleChange`: EventEmitter

**Signals**:
- `count`: signal (any)
- `doubled`: computed (any)

**Lifecycle Hooks**: ngOnInit, ngOnDestroy

## Services (3)

### AuthService
**File**: `/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/services/auth.service.ts:7`

Authentication service
WARNING: Contains security issues for demo

**Provided In**: `root`
---

### DataService
**File**: `/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/services/data.service.ts:6`

**Provided In**: `any`

**Dependencies**:
- `http`: HttpClient
- `authService`: AuthService
---

### UserService
**File**: `/home/antoine/dev/ng-parser/examples/sample-angular-app/src/user.service.ts:8`

User service for managing user data

**Provided In**: `root`

**Dependencies**:
- `http`: HttpClient

## Modules (2)

### SharedModule
**File**: `/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/modules/shared.module.ts:5`

**Imports**: CommonModule

**Declarations**: DashboardComponent

**Exports**: DashboardComponent
---

### AppModule
**File**: `/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app.module.ts:10`

Root application module

**Imports**: BrowserModule, HttpClientModule

**Providers**: UserService

## Relationships (14)

### imports (5)

- `component:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/components/user-list.component.ts:UserListComponent` → `unresolved:CommonModule`
- `module:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/modules/shared.module.ts:SharedModule` → `unresolved:CommonModule`
- `component:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app.component.ts:AppComponent` → `unresolved:CommonModule`
- `module:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app.module.ts:AppModule` → `unresolved:BrowserModule`
- `module:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app.module.ts:AppModule` → `unresolved:HttpClientModule`

### injects (6)

- `component:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/components/user-list.component.ts:UserListComponent` → `service:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/user.service.ts:UserService`
- `directive:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/directives/highlight.directive.ts:HighlightDirective` → `unresolved:ElementRef`
- `service:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/services/data.service.ts:DataService` → `unresolved:HttpClient`
- `service:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/services/data.service.ts:DataService` → `service:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/services/auth.service.ts:AuthService`
- `service:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/user.service.ts:UserService` → `unresolved:HttpClient`
- `component:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app.component.ts:AppComponent` → `service:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/user.service.ts:UserService`

### declares (1)

- `module:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/modules/shared.module.ts:SharedModule` → `component:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/components/dashboard.component.ts:DashboardComponent`

### exports (1)

- `module:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/modules/shared.module.ts:SharedModule` → `component:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app/components/dashboard.component.ts:DashboardComponent`

### provides (1)

- `module:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/app.module.ts:AppModule` → `service:/home/antoine/dev/ng-parser/examples/sample-angular-app/src/user.service.ts:UserService`


## Project Hierarchy

- **Angular Project** (app)