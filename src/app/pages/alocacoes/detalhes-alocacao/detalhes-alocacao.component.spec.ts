import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalhesAlocacaoComponent } from './detalhes-alocacao.component';

describe('DetalhesAlocacaoComponent', () => {
  let component: DetalhesAlocacaoComponent;
  let fixture: ComponentFixture<DetalhesAlocacaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalhesAlocacaoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetalhesAlocacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
