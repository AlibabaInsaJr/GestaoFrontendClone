import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalhesReparacaoComponent } from './detalhes-reparacao.component';

describe('DetalhesReparacaoComponent', () => {
  let component: DetalhesReparacaoComponent;
  let fixture: ComponentFixture<DetalhesReparacaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalhesReparacaoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetalhesReparacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
