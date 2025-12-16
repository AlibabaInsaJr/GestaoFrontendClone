import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalhesDevolucaoComponent } from './detalhes-devolucao.component';

describe('DetalhesDevolucaoComponent', () => {
  let component: DetalhesDevolucaoComponent;
  let fixture: ComponentFixture<DetalhesDevolucaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalhesDevolucaoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetalhesDevolucaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
