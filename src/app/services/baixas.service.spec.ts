import { TestBed } from '@angular/core/testing';

import { BaixasService } from './baixas.service';

describe('BaixasService', () => {
  let service: BaixasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaixasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
