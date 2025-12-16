import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReparacoesComponent } from './reparacoes.component';

describe('ReparacoesComponent', () => {
  let component: ReparacoesComponent;
  let fixture: ComponentFixture<ReparacoesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReparacoesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ReparacoesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
