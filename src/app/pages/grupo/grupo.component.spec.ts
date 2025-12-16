import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrupoComponent } from './grupo.component';

describe('GrupoComponent', () => {
  let component: GrupoComponent;
  let fixture: ComponentFixture<GrupoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GrupoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GrupoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
