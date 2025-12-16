import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlocacoesComponent } from './alocacoes.component';

describe('AlocacoesComponent', () => {
  let component: AlocacoesComponent;
  let fixture: ComponentFixture<AlocacoesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlocacoesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AlocacoesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
