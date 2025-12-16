import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalhesEquipamentoComponent } from './detalhes-equipamento.component';

describe('DetalhesEquipamentoComponent', () => {
  let component: DetalhesEquipamentoComponent;
  let fixture: ComponentFixture<DetalhesEquipamentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalhesEquipamentoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetalhesEquipamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
