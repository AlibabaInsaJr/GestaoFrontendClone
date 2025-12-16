import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalhesUtilizadorComponent } from './detalhes-utilizador.component';

describe('DetalhesUtilizadorComponent', () => {
  let component: DetalhesUtilizadorComponent;
  let fixture: ComponentFixture<DetalhesUtilizadorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalhesUtilizadorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetalhesUtilizadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
