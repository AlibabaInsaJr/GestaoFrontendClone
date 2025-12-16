import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalhesMarcaComponent } from './detalhes-marca.component';

describe('DetalhesMarcaComponent', () => {
  let component: DetalhesMarcaComponent;
  let fixture: ComponentFixture<DetalhesMarcaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalhesMarcaComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetalhesMarcaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
