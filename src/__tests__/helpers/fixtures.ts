/**
 * Test fixtures - Sample Angular code for testing
 */

export const SIMPLE_COMPONENT = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-simple',
  template: '<h1>Simple Component</h1>',
  styles: ['h1 { color: blue; }']
})
export class SimpleComponent {
  title = 'Simple';
}
`;

export const STANDALONE_COMPONENT = `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-standalone',
  standalone: true,
  imports: [CommonModule],
  template: '<h1>Standalone Component</h1>'
})
export class StandaloneComponent {
  message = 'Hello';
}
`;

export const COMPONENT_WITH_SIGNALS = `
import { Component, signal, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-signals',
  standalone: true,
  template: '<div>{{ count() }}</div>'
})
export class SignalsComponent {
  // Signal-based state
  count = signal(0);
  doubled = computed(() => this.count() * 2);

  // Signal-based inputs/outputs
  name = input<string>('default');
  value = input.required<number>();
  changed = output<number>();

  increment() {
    this.count.update(n => n + 1);
    this.changed.emit(this.count());
  }
}
`;

export const COMPONENT_WITH_INPUTS_OUTPUTS = `
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-io',
  template: '<button (click)="handleClick()">Click</button>'
})
export class IoComponent {
  @Input() required!: string;
  @Input() optional?: number;
  @Input('customName') aliased: string = '';

  @Output() clicked = new EventEmitter<void>();
  @Output('customEvent') aliasedEvent = new EventEmitter<string>();

  handleClick() {
    this.clicked.emit();
  }
}
`;

export const COMPONENT_WITH_LIFECYCLE = `
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-lifecycle',
  template: '<div>Lifecycle</div>'
})
export class LifecycleComponent implements OnInit, OnDestroy, AfterViewInit {
  ngOnInit() {}
  ngOnDestroy() {}
  ngAfterViewInit() {}
}
`;

export const COMPONENT_WITH_CHANGE_DETECTION = `
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-onpush',
  template: '<div>OnPush</div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnPushComponent {}
`;

export const COMPONENT_WITH_PROVIDERS = `
import { Component } from '@angular/core';
import { MyService } from './my-service';

@Component({
  selector: 'app-providers',
  template: '<div>Providers</div>',
  providers: [MyService],
  viewProviders: [{ provide: 'TOKEN', useValue: 123 }]
})
export class ProvidersComponent {
  constructor(private service: MyService) {}
}
`;

export const SIMPLE_SERVICE = `
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SimpleService {
  getData() {
    return 'data';
  }
}
`;

export const SERVICE_WITH_DEPENDENCIES = `
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SimpleService } from './simple-service';

@Injectable({
  providedIn: 'root'
})
export class DependentService {
  constructor(
    private http: HttpClient,
    private simpleService: SimpleService
  ) {}

  fetchData() {
    return this.http.get('/api/data');
  }
}
`;

export const SIMPLE_MODULE = `
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimpleComponent } from './simple.component';
import { IoComponent } from './io.component';

@NgModule({
  declarations: [SimpleComponent, IoComponent],
  imports: [CommonModule],
  exports: [SimpleComponent],
  providers: []
})
export class SimpleModule {}
`;

export const MODULE_WITH_PROVIDERS = `
import { NgModule } from '@angular/core';
import { SimpleService } from './simple.service';

@NgModule({
  providers: [
    SimpleService,
    { provide: 'API_URL', useValue: 'http://api.example.com' }
  ]
})
export class ConfigModule {}
`;

export const SIMPLE_DIRECTIVE = `
import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appHighlight]'
})
export class HighlightDirective {
  @HostListener('mouseenter') onMouseEnter() {
    // highlight logic
  }
}
`;

export const STANDALONE_DIRECTIVE = `
import { Directive } from '@angular/core';

@Directive({
  selector: '[appStandalone]',
  standalone: true
})
export class StandaloneDirective {}
`;

export const DIRECTIVE_WITH_INPUTS_OUTPUTS = `
import { Directive, Input, Output, EventEmitter } from '@angular/core';

@Directive({
  selector: '[appToggle]'
})
export class ToggleDirective {
  @Input() enabled: boolean = true;
  @Input('customAttr') customInput: string = '';
  @Output() toggled = new EventEmitter<boolean>();
}
`;

export const STRUCTURAL_DIRECTIVE = `
import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appUnless]'
})
export class UnlessDirective {
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}

  @Input() set appUnless(condition: boolean) {
    if (!condition) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
`;

export const SIMPLE_PIPE = `
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'capitalize',
  pure: true
})
export class CapitalizePipe implements PipeTransform {
  transform(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
`;

export const IMPURE_PIPE = `
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter',
  pure: false
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], searchText: string): any[] {
    if (!items) return [];
    if (!searchText) return items;
    return items.filter(item => item.includes(searchText));
  }
}
`;

export const STANDALONE_PIPE = `
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'reverse',
  standalone: true,
  pure: true
})
export class ReversePipe implements PipeTransform {
  transform(value: string): string {
    return value.split('').reverse().join('');
  }
}
`;

export const MALFORMED_COMPONENT = `
import { Component } from '@angular/core';

// Missing decorator arguments
@Component()
export class MalformedComponent {}
`;

export const COMPONENT_WITHOUT_DECORATOR = `
export class NotAComponent {
  title = 'Not a component';
}
`;
