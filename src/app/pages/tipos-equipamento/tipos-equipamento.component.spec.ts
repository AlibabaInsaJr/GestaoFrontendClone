import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TiposEquipamentoComponent } from './tipos-equipamento.component';

describe('TiposEquipamentoComponent', () => {
  let component: TiposEquipamentoComponent;
  let fixture: ComponentFixture<TiposEquipamentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TiposEquipamentoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TiposEquipamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
