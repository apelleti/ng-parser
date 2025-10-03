import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormatDatePipe } from '../pipes/format-date.pipe';

/**
 * Product card component with external template and styles
 * Demonstrates template and style parsing
 */
@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, FormatDatePipe],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent {
  @Input() productName: string = '';
  @Input() price: number = 0;
  @Input() createdAt: Date = new Date();
  @Input() isAvailable: boolean = true;

  onAddToCart() {
    console.log('Added to cart:', this.productName);
  }
}
