import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaixasComponent } from './baixas.component';

describe('BaixasComponent', () => {
  let component: BaixasComponent;
  let fixture: ComponentFixture<BaixasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaixasComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BaixasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
