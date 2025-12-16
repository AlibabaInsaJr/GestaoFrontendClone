import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalhesAquisicaoComponent } from './detalhes-aquisicao.component';

describe('DetalhesAquisicaoComponent', () => {
  let component: DetalhesAquisicaoComponent;
  let fixture: ComponentFixture<DetalhesAquisicaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalhesAquisicaoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetalhesAquisicaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
